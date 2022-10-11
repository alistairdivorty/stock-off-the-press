import { Construct } from 'constructs';
import { Stack, StackProps, aws_ec2 as ec2 } from 'aws-cdk-lib';

export class VPCStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        new ec2.Vpc(this, 'VPC', {
            vpcName: 'VPC',
            cidr: '10.0.0.0/16',
            natGateways: 1,
            maxAzs: 2,
            subnetConfiguration: [
                {
                    name: 'public-subnet',
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24
                },
                {
                    name: 'private-subnet',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24
                }
            ]
        });
    }
}
