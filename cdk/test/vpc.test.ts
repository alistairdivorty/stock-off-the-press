import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/vpc-stack';

describe('Stack Created', () => {
    const app = new cdk.App();
    const stack = new Cdk.VPCStack(app, 'TestStack');
    const template = Template.fromStack(stack);

    test('VPC Created', () => {
        template.hasResourceProperties('AWS::EC2::VPC', {
            CidrBlock: '10.0.0.0/16'
        });
    });
});
