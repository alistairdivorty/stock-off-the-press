import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    DockerImage,
    Fn,
    CfnOutput,
    Duration,
    RemovalPolicy,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_s3_assets as assets,
    aws_lambda as lambda,
    aws_iam as iam,
    aws_apigateway as apigw,
    aws_route53 as route53,
    aws_certificatemanager as acm,
    aws_events as events,
    aws_events_targets as targets
} from 'aws-cdk-lib';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import { PostgresCreateDatabase } from './custom-resources/postgres-create-database/postgres-create-database';
import { Nextjs } from 'cdk-nextjs-standalone';

export class WebAppStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            vpcName: 'VPC'
        });

        const postgresEndpoint = Fn.importValue('PostgresEndpoint');

        const pgCreateDatabase = new PostgresCreateDatabase(
            this,
            'PostgresCreateDatabaseResource',
            {
                vpcId: vpc.vpcId,
                dbName: 'stockpress',
                secretName: 'rds/postgres/master',
                userKey: 'username',
                passwordKey: 'password',
                host: postgresEndpoint,
                port: 5432
            }
        );

        new CfnOutput(this, 'PostgresCreateDatabaseResponse', {
            value: pgCreateDatabase.response
        });

        const envVarsBucket = new s3.Bucket(this, 'EnvVarsBucket', {
            bucketName: 'zappa-axm3891lp',
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            versioned: false,
            publicReadAccess: false
        });

        vpc.addGatewayEndpoint('VPCS3Endpoint', {
            service: ec2.GatewayVpcEndpointAwsService.S3
        });

        const envVarsBucketDeployment = new s3deploy.BucketDeployment(
            this,
            'EnvVarsBucketDeployment',
            {
                sources: [
                    s3deploy.Source.asset('../web-backend', {
                        bundling: {
                            image: DockerImage.fromRegistry('python:3.9'),
                            command: [
                                'sh',
                                '-c',
                                `
                                    python3 -m env-to-json;
                                    cp env.json /asset-output/env.json
                                `
                            ]
                        },
                        exclude: [
                            '*',
                            '.*',
                            '!.env.production',
                            '!env-to-json.py'
                        ]
                    })
                ],
                destinationBucket: envVarsBucket,
                destinationKeyPrefix: 'backend',
                memoryLimit: 128,
                prune: false
            }
        );

        const deploymentBundle = new assets.Asset(this, 'BundledApp', {
            path: '../web-backend',
            bundling: {
                image: DockerImage.fromBuild('../web-backend', {
                    platform: 'linux/amd64'
                }),
                command: [
                    'sh',
                    '-c',
                    `
                        python3 -m venv venv;
                        . venv/bin/activate;
                        python3 -m pip install -r requirements.txt;
                        zappa package production -o bundle.zip;
                        cp bundle.zip /asset-output/bundle.zip
                    `
                ]
            }
        });

        const lambdaFunction = new lambda.Function(this, 'function', {
            runtime: lambda.Runtime.PYTHON_3_9,
            code: lambda.Code.fromBucket(
                deploymentBundle.bucket,
                deploymentBundle.s3ObjectKey
            ),
            handler: 'handler.lambda_handler',
            timeout: Duration.seconds(30),
            vpc: vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            allowPublicSubnet: true,
            memorySize: 1024,
            tracing: lambda.Tracing.ACTIVE
        });

        lambdaFunction.node.addDependency(envVarsBucketDeployment);

        lambdaFunction.role?.attachInlinePolicy(
            new iam.Policy(this, 'FunctionS3AccessPolicy', {
                statements: [
                    new iam.PolicyStatement({
                        actions: ['s3:*'],
                        resources: ['*']
                    })
                ]
            })
        );

        const eventRule = new events.Rule(this, 'FunctionWarming', {
            schedule: events.Schedule.rate(Duration.minutes(5))
        });

        eventRule.addTarget(new targets.LambdaFunction(lambdaFunction));

        const api = new apigw.LambdaRestApi(this, 'RestAPI', {
            handler: lambdaFunction
        });

        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
            this,
            'HostedZone',
            {
                zoneName: 'stockoffthepress.com',
                hostedZoneId: process.env.HOSTED_ZONE_ID as string
            }
        );

        api.addDomainName('CustomDomain', {
            certificate: new acm.Certificate(this, 'certificate', {
                domainName: 'api.stockoffthepress.com',
                validation: acm.CertificateValidation.fromDns(hostedZone)
            }),
            domainName: 'api.stockoffthepress.com'
        });

        new route53.ARecord(this, 'ARecord', {
            zone: hostedZone,
            recordName: 'api.stockoffthepress.com',
            target: route53.RecordTarget.fromAlias(new ApiGateway(api))
        });

        const nextjs = new Nextjs(this, 'WebFrontend', {
            nextjsPath: '../web-frontend',
            projectRoot: '..'
        });

        new CfnOutput(this, 'WebFrontendURL', {
            value: nextjs.url
        });
    }
}
