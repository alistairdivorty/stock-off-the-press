import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    Duration,
    RemovalPolicy,
    CfnOutput,
    aws_ec2 as ec2,
    aws_lambda as lambda,
    aws_apigateway as apigateway,
    aws_ecs as ecs,
    aws_logs as logs,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_iam as iam
} from 'aws-cdk-lib';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

export class CrawlerStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            vpcName: 'VPC'
        });

        const ftFunction = new lambda.DockerImageFunction(this, 'ft', {
            code: lambda.DockerImageCode.fromImageAsset(
                '../crawler-project/lambdas/ft',
                {
                    platform: Platform.LINUX_AMD64
                }
            ),
            memorySize: 1024,
            timeout: Duration.seconds(60),
            environment: {
                HOME: '/tmp'
            }
        });

        const api = new apigateway.RestApi(this, 'crawler-api', {
            restApiName: 'crawler-services',
            cloudWatchRole: true
        });

        const ftResource = api.root.addResource('ft');

        const integrationResponses: Array<apigateway.IntegrationResponse> = [
            {
                statusCode: '200'
            },
            {
                selectionPattern: '.*CAPTCHA.*',
                statusCode: '401',
                responseTemplates: {
                    'application/json': JSON.stringify({
                        errorMessage:
                            "$util.escapeJavaScript($input.path('$.errorMessage'))"
                    })
                }
            }
        ];

        const ftIntegration = new apigateway.LambdaIntegration(ftFunction, {
            proxy: false,
            integrationResponses: integrationResponses
        });

        const responseModel = api.addModel('ResponseModel', {
            contentType: 'application/json',
            modelName: 'ResponseModel',
            schema: {
                schema: apigateway.JsonSchemaVersion.DRAFT4,
                title: 'response',
                type: apigateway.JsonSchemaType.OBJECT
            }
        });

        const errorResponseModel = api.addModel('ErrorResponseModel', {
            contentType: 'application/json',
            modelName: 'ErrorResponseModel',
            schema: {
                schema: apigateway.JsonSchemaVersion.DRAFT4,
                title: 'errorResponse',
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    errorMessage: { type: apigateway.JsonSchemaType.STRING }
                }
            }
        });

        const methodResponses: Array<apigateway.MethodResponse> = [
            {
                statusCode: '200',
                responseModels: {
                    'application/json': responseModel
                }
            },
            {
                statusCode: '401',
                responseModels: {
                    'application/json': errorResponseModel
                }
            }
        ];

        ftResource.addMethod('POST', ftIntegration, {
            methodResponses: methodResponses
        });

        const cluster = new ecs.Cluster(this, 'Crawler', {
            vpc: vpc
        });

        new CfnOutput(this, 'ClusterName', {
            value: cluster.clusterName,
            exportName: 'ClusterName'
        });

        new CfnOutput(this, 'PublicSubnets', {
            value: vpc.publicSubnets.map((s) => s.subnetId).join(','),
            exportName: 'PublicSubnets'
        });

        const ftTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskFT', {
            memoryLimitMiB: 1024,
            cpu: 512
        });

        new CfnOutput(this, 'FtTaskDefinitionName', {
            value: ftTaskDefinition.family,
            exportName: 'FtTaskDefinitionName'
        });

        const priceTaskDefinition = new ecs.FargateTaskDefinition(
            this,
            'TaskPrice',
            {
                memoryLimitMiB: 1024,
                cpu: 512
            }
        );

        new CfnOutput(this, 'PriceTaskDefinitionName', {
            value: priceTaskDefinition.family,
            exportName: 'PriceTaskDefinitionName'
        });

        const envVarsBucket = new s3.Bucket(this, 'env-vars-bucket', {
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            versioned: false,
            publicReadAccess: false
        });

        new s3deploy.BucketDeployment(this, 'env-vars-bucket-deployment', {
            sources: [
                s3deploy.Source.asset('../crawler-project', {
                    exclude: ['*', '.*', '!production.env']
                })
            ],
            destinationBucket: envVarsBucket,
            destinationKeyPrefix: 'crawler',
            memoryLimit: 128,
            prune: false
        });

        const s3Policy = new iam.PolicyStatement({
            actions: ['s3:GetBucketLocation', 's3:GetObject'],
            resources: [
                envVarsBucket.bucketArn,
                envVarsBucket.arnForObjects('crawler/*')
            ]
        });

        ftTaskDefinition.addToTaskRolePolicy(s3Policy);
        ftTaskDefinition.addToExecutionRolePolicy(s3Policy);

        priceTaskDefinition.addToTaskRolePolicy(s3Policy);
        priceTaskDefinition.addToExecutionRolePolicy(s3Policy);

        const ftService = new ecs.FargateService(this, 'ServiceFT', {
            cluster: cluster,
            taskDefinition: ftTaskDefinition,
            desiredCount: 0
        });

        new CfnOutput(this, 'FtFargateServiceSecurityGroup', {
            value: ftService.connections.securityGroups[0].securityGroupId,
            exportName: 'FtFargateServiceSecurityGroup'
        });

        ftTaskDefinition.addContainer('container-ft', {
            image: ecs.ContainerImage.fromAsset('../crawler-project', {
                platform: Platform.LINUX_AMD64
            }),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'FT',
                logRetention: logs.RetentionDays.THREE_DAYS
            }),
            environmentFiles: [
                ecs.EnvironmentFile.fromBucket(
                    envVarsBucket,
                    'crawler/production.env'
                )
            ]
        });

        const priceService = new ecs.FargateService(this, 'ServicePrice', {
            cluster: cluster,
            taskDefinition: priceTaskDefinition,
            desiredCount: 0
        });

        new CfnOutput(this, 'PriceFargateServiceSecurityGroup', {
            value: priceService.connections.securityGroups[0].securityGroupId,
            exportName: 'PriceFargateServiceSecurityGroup'
        });

        priceTaskDefinition.addContainer('container-price', {
            image: ecs.ContainerImage.fromAsset('../crawler-project', {
                platform: Platform.LINUX_AMD64
            }),
            logging: ecs.LogDrivers.awsLogs({
                streamPrefix: 'Price',
                logRetention: logs.RetentionDays.THREE_DAYS
            }),
            environmentFiles: [
                ecs.EnvironmentFile.fromBucket(
                    envVarsBucket,
                    'crawler/production.env'
                )
            ]
        });
    }
}
