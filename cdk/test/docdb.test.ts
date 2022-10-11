import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as Cdk from '../lib/docdb-stack';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Stack Created', () => {
    const app = new cdk.App();
    const stack = new Cdk.DocDBStack(app, 'TestStack', {
        env: {
            account: process.env.AWS_ACCOUNT_ID,
            region: 'eu-west-1'
        }
    });
    const template = Template.fromStack(stack);

    test('Database Cluster Created', () => {
        template.hasResourceProperties('AWS::DocDB::DBCluster', {
            Port: 27017
        });
    });

    test('Jump Box Created', () => {
        template.hasResourceProperties('AWS::EC2::Instance', {
            InstanceType: 't2.micro'
        });
    });
});
