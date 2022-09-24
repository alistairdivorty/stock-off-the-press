import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/cdk-stack';

test('Lambda Function Created', () => {
    const app = new cdk.App();
    const stack = new Cdk.CrawlerStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Lambda::Function', {
        MemorySize: 1024,
        PackageType: 'Image',
        Timeout: 60
    });
});
