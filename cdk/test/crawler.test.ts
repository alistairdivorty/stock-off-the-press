import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/crawler-stack';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Stack Created', () => {
    const app = new cdk.App();
    const stack = new Cdk.CrawlerStack(app, 'TestStack', {
        env: {
            account: process.env.AWS_ACCOUNT_ID,
            region: 'eu-west-1'
        }
    });
    const template = Template.fromStack(stack);

    test('Lambda Function Created', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            MemorySize: 1024,
            PackageType: 'Image',
            Timeout: 60
        });
    });

    test('API Created', () => {
        template.hasResourceProperties('AWS::ApiGateway::Resource', {
            PathPart: 'ft'
        });

        template.hasResourceProperties('AWS::ApiGateway::Method', {
            HttpMethod: 'POST',
            Integration: {
                IntegrationHttpMethod: 'POST',
                IntegrationResponses: [
                    {
                        StatusCode: '200'
                    },
                    {
                        ResponseTemplates: {
                            'application/json':
                                '{"errorMessage":"$util.escapeJavaScript($input.path(\'$.errorMessage\'))"}'
                        },
                        SelectionPattern: '.*CAPTCHA.*',
                        StatusCode: '401'
                    }
                ]
            }
        });
    });

    test('Fargate Task Definition Created', () => {
        template.hasResourceProperties('AWS::ECS::TaskDefinition', {
            ContainerDefinitions: [
                {
                    Essential: true,
                    Name: 'container-ft'
                }
            ],
            Cpu: '512',
            Memory: '1024'
        });
    });
});
