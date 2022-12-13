import { Construct } from 'constructs';
import {
    Duration,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_secretsmanager as sm
} from 'aws-cdk-lib';
import { defaultDBConfig } from '../config';

export interface DBConfig {
    readonly dbName: string;
    readonly masterUsername: string;
    readonly port: number;
    readonly instanceType: ec2.InstanceType;
    readonly allocatedStorageInGB: number;
    readonly backupRetentionInDays: number;
}

export interface RDSConstructProps {
    readonly vpc: ec2.IVpc;
    readonly defaultVpcSecurityGroup: ec2.ISecurityGroup;
    readonly dbConfig?: DBConfig;
}

export class RDSConstruct extends Construct {
    public readonly dbConnection: string;
    public readonly rdsInstance: rds.DatabaseInstance;

    constructor(parent: Construct, name: string, props: RDSConstructProps) {
        super(parent, name);

        const backendSecret: sm.ISecret = new sm.Secret(
            this,
            'DatabaseSecret',
            {
                secretName: name + 'Secret',
                description: 'Airflow RDS secrets',
                generateSecretString: {
                    secretStringTemplate: JSON.stringify({
                        username: defaultDBConfig.masterUsername
                    }),
                    generateStringKey: 'password',
                    excludeUppercase: false,
                    requireEachIncludedType: false,
                    includeSpace: false,
                    excludePunctuation: true,
                    excludeLowercase: false,
                    excludeNumbers: false,
                    excludeCharacters: '/@"',
                    passwordLength: 16
                }
            }
        );

        const databasePasswordSecret =
            backendSecret.secretValueFromJson('password');

        this.rdsInstance = new rds.DatabaseInstance(this, 'RDSInstance', {
            engine: rds.DatabaseInstanceEngine.postgres({
                version: rds.PostgresEngineVersion.VER_14
            }),
            instanceType: defaultDBConfig.instanceType,
            instanceIdentifier: defaultDBConfig.dbName,
            vpc: props.vpc,
            securityGroups: [props.defaultVpcSecurityGroup],
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
            storageEncrypted: true,
            multiAz: false,
            autoMinorVersionUpgrade: false,
            allocatedStorage: defaultDBConfig.allocatedStorageInGB,
            storageType: rds.StorageType.GP2,
            backupRetention: Duration.days(
                defaultDBConfig.backupRetentionInDays
            ),
            deletionProtection: false,
            credentials: {
                username: defaultDBConfig.masterUsername,
                password: databasePasswordSecret
            },
            databaseName: defaultDBConfig.dbName,
            port: defaultDBConfig.port
        });

        this.dbConnection = this.getDBConnection(
            defaultDBConfig,
            this.rdsInstance.dbInstanceEndpointAddress,
            databasePasswordSecret.unsafeUnwrap()
        );
    }

    public getDBConnection(
        dbConfig: DBConfig,
        endpoint: string,
        password: string
    ): string {
        return `postgresql+psycopg2://${dbConfig.masterUsername}:${password}@${endpoint}:${dbConfig.port}/${dbConfig.dbName}`;
    }
}
