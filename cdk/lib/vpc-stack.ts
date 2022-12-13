import { Construct } from 'constructs';
import { Stack, StackProps, CfnOutput, aws_ec2 as ec2 } from 'aws-cdk-lib';

export class VPCStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'VPC', {
            vpcName: 'VPC',
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
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

        new CfnOutput(this, 'VPCPublicSubnet1', {
            value: vpc.publicSubnets[0].subnetId
        });

        new CfnOutput(this, 'VPCPublicSubnet2', {
            value: vpc.publicSubnets[1].subnetId
        });
    }
}
