import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/cdk-stack';

describe('Stack Created', () => {
    const app = new cdk.App();
    const stack = new Cdk.CrawlerStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    test('Lambda Function Created', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            MemorySize: 1024,
            PackageType: 'Image',
            Timeout: 60
        });
    });

    test('API Created', () => {
        const app = new cdk.App();
        const stack = new Cdk.CrawlerStack(app, 'TestStack');
        const template = Template.fromStack(stack);

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
});
