import {
    Stack,
    StackProps,
    App,
    aws_ec2 as ec2,
    aws_ecs as ecs
} from 'aws-cdk-lib';
import { RDSConstruct } from './constructs/rds';
import { AirflowConstruct } from './constructs/airflow-construct';
import { DagTasks } from './constructs/dag-tasks';

export class FarFlowStack extends Stack {
    constructor(scope: App, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'vpc', {
            vpcName: 'VPC'
        });

        const cluster = new ecs.Cluster(this, 'FarFlow', { vpc: vpc });

        const defaultVpcSecurityGroup = new ec2.SecurityGroup(
            this,
            'SecurityGroup',
            { vpc: vpc }
        );

        const rds = new RDSConstruct(this, 'RDSPostgres', {
            defaultVpcSecurityGroup: defaultVpcSecurityGroup,
            vpc: vpc
        });

        new AirflowConstruct(this, 'AirflowService', {
            cluster: cluster,
            vpc: vpc,
            dbConnection: rds.dbConnection,
            defaultVpcSecurityGroup: defaultVpcSecurityGroup,
            privateSubnets: vpc.privateSubnets
        });

        new DagTasks(this, 'DagTasks', {
            vpc: vpc,
            defaultVpcSecurityGroup: defaultVpcSecurityGroup
        });
    }
}
