import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    aws_ec2 as ec2,
    aws_docdb as docdb,
    aws_iam as iam
} from 'aws-cdk-lib';
import * as dotenv from 'dotenv';

dotenv.config();

export class DocDBStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            vpcName: 'VPC'
        });

        const docDBSecurityGroup = new ec2.SecurityGroup(
            this,
            'documentdb-sg',
            {
                vpc,
                allowAllOutbound: true,
                description: 'Amazon DocumentDB Security Group'
            }
        );

        docDBSecurityGroup.addIngressRule(
            ec2.Peer.ipv4('10.0.0.0/16'),
            ec2.Port.tcp(27017)
        );

        const docDBSubnetGroup = new docdb.CfnDBSubnetGroup(
            this,
            'documentdb-subnet-group',
            {
                subnetIds: vpc.privateSubnets.map((s) => s.subnetId),
                dbSubnetGroupName: 'documentdb-subnet-group',
                dbSubnetGroupDescription: 'Subnet Group for DocumentDB'
            }
        );

        const clusterParameterGroup = new docdb.ClusterParameterGroup(
            this,
            'cluster-parameter-group',
            {
                family: 'docdb4.0',
                parameters: {
                    tls: process.env.DB_CLUSTER_TLS as string
                },
                dbClusterParameterGroupName: 'custom'
            }
        );

        const docDBCluster = new docdb.CfnDBCluster(
            this,
            'documentdb-cluster',
            {
                storageEncrypted: true,
                availabilityZones: vpc.availabilityZones,
                dbClusterIdentifier: 'documentdb-base',
                dbClusterParameterGroupName:
                    clusterParameterGroup.parameterGroupName,
                masterUsername: process.env.DB_MASTER_USERNAME as string,
                masterUserPassword: process.env
                    .DB_MASTER_USER_PASSWORD as string,
                vpcSecurityGroupIds: [docDBSecurityGroup.securityGroupId],
                dbSubnetGroupName: docDBSubnetGroup.dbSubnetGroupName,
                port: 27017
            }
        );

        docDBCluster.addDependsOn(docDBSubnetGroup);

        const dbInstance = new docdb.CfnDBInstance(
            this,
            'documentdb-instance',
            {
                dbClusterIdentifier: docDBCluster.ref,
                autoMinorVersionUpgrade: true,
                dbInstanceClass: 'db.t4g.medium',
                dbInstanceIdentifier: 'production'
            }
        );

        dbInstance.addDependsOn(docDBCluster);

        const jumpBoxSecurityGroup = new ec2.SecurityGroup(
            this,
            'jump-box-sg',
            {
                vpc,
                allowAllOutbound: true,
                description: 'Jump Box Security Group'
            }
        );

        jumpBoxSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(22)
        );

        jumpBoxSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80)
        );

        jumpBoxSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443)
        );

        const jumpBoxRole = new iam.Role(this, 'jump-box-role', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'AdministratorAccess'
                )
            ]
        });

        new ec2.Instance(this, 'ec2-instance', {
            vpc,
            vpcSubnets: {
                subnetType: ec2.SubnetType.PUBLIC
            },
            role: jumpBoxRole,
            securityGroup: jumpBoxSecurityGroup,
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE2,
                ec2.InstanceSize.MICRO
            ),
            machineImage: new ec2.AmazonLinuxImage({
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
            }),
            keyName: 'ec2-key-pair'
        });
    }
}
