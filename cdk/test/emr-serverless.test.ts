import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/emr-serverless-stack';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Stack Created', () => {
    const app = new cdk.App();
    const stack = new Cdk.EMRServerlessStack(app, 'TestStack', {
        env: {
            account: process.env.AWS_ACCOUNT_ID,
            region: 'eu-west-1'
        }
    });
    const template = Template.fromStack(stack);

    test('EMR Serverless Application Created', () => {
        template.hasResourceProperties('AWS::EMRServerless::Application', {
            Name: 'stock-off-the-press',
            Type: 'SPARK'
        });
    });
});
