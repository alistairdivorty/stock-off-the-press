import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    RemovalPolicy,
    Size,
    CfnOutput,
    aws_emrserverless as emrs,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_s3_assets as assets,
    aws_s3_deployment as s3deploy,
    aws_iam as iam
} from 'aws-cdk-lib';
import { S3CopyObject } from './custom-resources/s3-copy-object/s3-copy-object';

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

        const asset = new assets.Asset(this, 'EnvironmentAsset', {
            path: '../ml-pipeline/artifacts/packages.tar.gz'
        });

        new S3CopyObject(this, 'S3CopyObjectResource', {
            Bucket: bucket.bucketName,
            CopySource: `/${asset.s3BucketName}/${asset.s3ObjectKey}`,
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

        new CfnOutput(this, 'JobsURL', {
            value: bucket.s3UrlForObject('jobs/')
        });

        new CfnOutput(this, 'ConfigsURL', {
            value: bucket.s3UrlForObject('config/')
        });

        new CfnOutput(this, 'ArtifactsURL', {
            value: bucket.s3UrlForObject('artifacts/')
        });

        new CfnOutput(this, 'ModelsURL', {
            value: bucket.s3UrlForObject('models/')
        });

        new CfnOutput(this, 'LogsURL', {
            value: bucket.s3UrlForObject('logs/')
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
            value: emrServerlessJobRole.roleArn
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
            value: emrServerlessApp.attrApplicationId
        });
    }
}
