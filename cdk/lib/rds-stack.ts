import { Construct } from 'constructs';
import {
    Stack,
    StackProps,
    Duration,
    CfnOutput,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_secretsmanager as sm,
    aws_iam as iam
} from 'aws-cdk-lib';

export class RDSStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            vpcName: 'VPC'
        });

        const rdsSecurityGroup = new ec2.SecurityGroup(this, 'rds-sg', {
            vpc,
            allowAllOutbound: true,
            description: 'Amazon RDS Security Group'
        });

        rdsSecurityGroup.addIngressRule(
            ec2.Peer.ipv4('10.0.0.0/16'),
            ec2.Port.tcp(5432)
        );

        const secret = sm.Secret.fromSecretNameV2(
            this,
            'secret',
            'rds/postgres/master'
        );

        const instance = new rds.DatabaseInstance(this, 'rds-instance', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_14
            }),
            instanceType: ec2.InstanceType.of(
                ec2.InstanceClass.T4G,
                ec2.InstanceSize.MICRO
            ),
            instanceIdentifier: 'rds-postgres',
            vpc: vpc,
            securityGroups: [rdsSecurityGroup],
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            storageEncrypted: true,
            multiAz: false,
            autoMinorVersionUpgrade: false,
            allocatedStorage: 5,
            storageType: rds.StorageType.GP2,
            backupRetention: Duration.days(5),
            deletionProtection: false,
            credentials: {
                username: secret.secretValueFromJson('username').unsafeUnwrap(),
                password: secret.secretValueFromJson('password')
            },
            port: 5432
        });

        new CfnOutput(this, 'PostgresEndpoint', {
            value: instance.dbInstanceEndpointAddress,
            exportName: 'PostgresEndpoint'
        });

        new CfnOutput(this, 'PostgresPort', {
            value: instance.dbInstanceEndpointPort,
            exportName: 'PostgresPort'
        });

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

        const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
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

        instance.connections.allowFrom(ec2Instance, ec2.Port.tcp(5432));
    }
}
