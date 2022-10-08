import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    Duration,
    aws_lambda as lambda,
    aws_apigateway as apigateway
} from 'aws-cdk-lib';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

export class CrawlerStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const ftFunction = new lambda.DockerImageFunction(this, 'ft', {
            code: lambda.DockerImageCode.fromImageAsset('../lambdas/ft', {
                platform: Platform.LINUX_AMD64
            }),
            memorySize: 1024,
            timeout: Duration.seconds(60)
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
    }
}
