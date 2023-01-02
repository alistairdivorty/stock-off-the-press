import { Construct } from 'constructs';
import {
    CfnOutput,
    Fn,
    aws_rds as rds,
    aws_ec2 as ec2,
    aws_secretsmanager as sm
} from 'aws-cdk-lib';
import { PostgresCreateDatabase } from '../../custom-resources/postgres-create-database/postgres-create-database';

export interface RDSConstructProps {
    readonly vpc: ec2.IVpc;
}

export class RDSConstruct extends Construct {
    public readonly dbConnection: string;
    public readonly rdsInstance: rds.DatabaseInstance;

    constructor(parent: Construct, name: string, props: RDSConstructProps) {
        super(parent, name);

        const postgresEndpoint = Fn.importValue('PostgresEndpoint');

        const dbName = 'farflow';

        const pgCreateDatabase = new PostgresCreateDatabase(
            this,
            'PostgresCreateDatabaseResource',
            {
                vpcId: props.vpc.vpcId,
                dbName: dbName,
                secretName: 'rds/postgres/master',
                userKey: 'username',
                passwordKey: 'password',
                host: postgresEndpoint,
                port: 5432
            }
        );

        new CfnOutput(this, 'PostgresCreateDatabaseResponse', {
            value: pgCreateDatabase.response
        });

        const secret = sm.Secret.fromSecretNameV2(
            this,
            'DatabaseSecret',
            'rds/postgres/master'
        );

        this.dbConnection = this.getDBConnection(
            dbName,
            postgresEndpoint,
            secret.secretValueFromJson('username').unsafeUnwrap(),
            secret.secretValueFromJson('password').unsafeUnwrap()
        );
    }

    public getDBConnection(
        dbName: string,
        endpoint: string,
        username: string,
        password: string
    ): string {
        return `postgresql+psycopg2://${username}:${password}@${endpoint}:5432/${dbName}`;
    }
}
