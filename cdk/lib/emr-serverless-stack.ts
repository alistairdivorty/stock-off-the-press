import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    RemovalPolicy,
    Size,
    DockerImage,
    CfnOutput,
    Fn,
    aws_emrserverless as emrs,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_s3_assets as assets,
    aws_s3_deployment as s3deploy,
    aws_iam as iam
} from 'aws-cdk-lib';
import { S3CopyObject } from './custom-resources/s3-copy-object/s3-copy-object';
import * as os from 'os';
import * as path from 'path';

export class EMRServerlessStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'bucket', {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            versioned: false,
            publicReadAccess: false
        });

        new s3deploy.BucketDeployment(this, 'CodeDeployment', {
            sources: [s3deploy.Source.asset('../ml-pipeline/jobs')],
            destinationBucket: bucket,
            destinationKeyPrefix: 'jobs'
        });

        new s3deploy.BucketDeployment(this, 'ArtifactsDeployment', {
            sources: [
                s3deploy.Source.asset('../ml-pipeline/artifacts', {
                    exclude: ['packages.tar.gz']
                })
            ],
            destinationBucket: bucket,
            destinationKeyPrefix: 'artifacts',
            ephemeralStorageSize: Size.gibibytes(5),
            memoryLimit: 5120,
            prune: false,
            exclude: ['packages.tar.gz']
        });

        const environmentAsset = new assets.Asset(this, 'EnvironmentAsset', {
            path: '../ml-pipeline/artifacts/packages.tar.gz'
        });

        new S3CopyObject(this, 'S3CopyObjectResource', {
            Bucket: bucket.bucketName,
            CopySource: `/${environmentAsset.s3BucketName}/${environmentAsset.s3ObjectKey}`,
            Key: 'artifacts/packages.tar.gz'
        });

        new s3deploy.BucketDeployment(this, 'AssetsDeployment', {
            sources: [s3deploy.Source.asset('../ml-pipeline/assets/models')],
            destinationBucket: bucket,
            destinationKeyPrefix: 'models',
            ephemeralStorageSize: Size.gibibytes(10),
            memoryLimit: 10240,
            prune: false
        });

        new s3deploy.BucketDeployment(this, 'ConfigsDeployment', {
            sources: [
                s3deploy.Source.asset('../ml-pipeline/config'),
                s3deploy.Source.jsonData('models.json', {
                    emrfsModelPath: bucket.s3UrlForObject('models/')
                })
            ],
            destinationBucket: bucket,
            destinationKeyPrefix: 'config'
        });

        const certificatesAsset = new assets.Asset(
            this,
            'BundledCertificates',
            {
                path: path.join(os.homedir(), '.ssh'),
                bundling: {
                    image: DockerImage.fromBuild('../ml-pipeline', {
                        file: 'cacerts.Dockerfile'
                    }),
                    command: [
                        'sh',
                        '-c',
                        `keytool -importcert \
                        -keystore /asset-output/cacerts.p12 \
                        -storepass ${process.env.TRUSTSTORE_PASSWORD} \
                        -file rds-ca-2019-root.pem \
                        -alias RDS \
                        -no-prompt; \
                        keytool -importkeystore \
                        -srckeystore /asset-output/cacerts.p12 \
                        -srcstoretype pkcs12 \
                        -srcstorepass ${process.env.TRUSTSTORE_PASSWORD} \
                        -destkeystore /asset-output/cacerts.jks \
                        -deststorepass ${process.env.TRUSTSTORE_PASSWORD} \
                        -deststoretype jks`
                    ]
                }
            }
        );

        const certificatesDeployment = new s3deploy.BucketDeployment(
            this,
            'CertificatesDeployment',
            {
                sources: [
                    s3deploy.Source.bucket(
                        certificatesAsset.bucket,
                        certificatesAsset.s3ObjectKey
                    )
                ],
                destinationBucket: bucket,
                destinationKeyPrefix: 'cacerts',
                extract: false
            }
        );

        new CfnOutput(this, 'JobsURI', {
            value: bucket.s3UrlForObject('jobs/'),
            exportName: 'JobsURI'
        });

        new CfnOutput(this, 'ConfigsURI', {
            value: bucket.s3UrlForObject('config/'),
            exportName: 'ConfigsURI'
        });

        new CfnOutput(this, 'ArtifactsURI', {
            value: bucket.s3UrlForObject('artifacts/'),
            exportName: 'ArtifactsURI'
        });

        new CfnOutput(this, 'ModelsURI', {
            value: bucket.s3UrlForObject('models/'),
            exportName: 'ModelsURI'
        });

        new CfnOutput(this, 'CertificatesURI', {
            value: certificatesDeployment.deployedBucket.s3UrlForObject(
                path.join(
                    'cacerts',
                    Fn.select(0, certificatesDeployment.objectKeys)
                )
            ),
            exportName: 'CertificatesURI'
        });

        new CfnOutput(this, 'LogsURI', {
            value: bucket.s3UrlForObject('logs/'),
            exportName: 'LogsURI'
        });

        const s3AccessPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        's3:ListBucket',
                        's3:GetObject',
                        's3:PutObject',
                        's3:DeleteObject'
                    ],
                    effect: iam.Effect.ALLOW,
                    resources: [bucket.bucketArn, `${bucket.bucketArn}/*`]
                })
            ]
        });

        const glueAccessPolicy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    actions: [
                        'glue:GetDatabase',
                        'glue:GetDataBases',
                        'glue:CreateTable',
                        'glue:GetTable',
                        'glue:GetTables',
                        'glue:GetPartition',
                        'glue:GetPartitions',
                        'glue:CreatePartition',
                        'glue:BatchCreatePartition',
                        'glue:GetUserDefinedFunctions'
                    ],
                    effect: iam.Effect.ALLOW,
                    resources: ['*']
                })
            ]
        });

        const emrServerlessJobRole = new iam.Role(
            this,
            'EMRServerlessJobRole',
            {
                assumedBy: new iam.CompositePrincipal(
                    new iam.ServicePrincipal('emr-serverless.amazonaws.com')
                ),
                inlinePolicies: {
                    s3AccessPolicy,
                    glueAccessPolicy
                }
            }
        );

        new CfnOutput(this, 'EMRServerlessJobRoleARN', {
            value: emrServerlessJobRole.roleArn,
            exportName: 'JobRoleARN'
        });

        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            vpcName: 'VPC'
        });

        const emrServerlessSecurityGroup = new ec2.SecurityGroup(
            this,
            'EMRServerlessSG',
            {
                vpc: vpc
            }
        );

        const emrServerlessApp = new emrs.CfnApplication(this, 'SparkApp', {
            releaseLabel: 'emr-6.6.0',
            type: 'SPARK',
            name: 'stock-off-the-press',
            networkConfiguration: {
                subnetIds: vpc.selectSubnets().subnetIds,
                securityGroupIds: [emrServerlessSecurityGroup.securityGroupId]
            },
            autoStopConfiguration: {
                enabled: true,
                idleTimeoutMinutes: 1
            }
        });

        new CfnOutput(this, 'ApplicationID', {
            value: emrServerlessApp.attrApplicationId,
            exportName: 'ApplicationID'
        });
    }
}
