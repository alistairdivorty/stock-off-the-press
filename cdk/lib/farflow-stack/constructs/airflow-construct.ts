import { Construct } from 'constructs';
import {
    CfnOutput,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_secretsmanager as sm
} from 'aws-cdk-lib';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { airflowTaskConfig, ContainerConfig } from '../config';
import { ServiceConstruct } from './service-construct';

export interface AirflowConstructProps {
    readonly vpc: ec2.IVpc;
    readonly cluster: ecs.ICluster;
    readonly dbConnection: string;
    readonly defaultVpcSecurityGroup: ec2.ISecurityGroup;
    readonly privateSubnets: ec2.ISubnet[];
}

export class AirflowConstruct extends Construct {
    public readonly adminPasswordOutput?: CfnOutput;

    constructor(parent: Construct, name: string, props: AirflowConstructProps) {
        super(parent, name);

        const airflowSecret = sm.Secret.fromSecretNameV2(
            this,
            'AirflowSecret',
            'airflow/admin'
        );

        const dbSecret = sm.Secret.fromSecretNameV2(
            this,
            'DatabaseSecret',
            'docdb/master'
        );

        const ENV_VARS = {
            AIRFLOW__SCHEDULER__MIN_FILE_PROCESS_INTERVAL: '60',
            AIRFLOW__CORE__SQL_ALCHEMY_CONN: props.dbConnection,
            AIRFLOW__CELERY__BROKER_URL: 'sqs://',
            AIRFLOW__CELERY__RESULT_BACKEND: `db+${props.dbConnection}`,
            AIRFLOW__CORE__EXECUTOR: 'CeleryExecutor',
            AIRFLOW__WEBSERVER__RBAC: 'True',
            ADMIN_PASS: airflowSecret
                .secretValueFromJson('password')
                .unsafeUnwrap(),
            CLUSTER: props.cluster.clusterName,
            SECURITY_GROUP: props.defaultVpcSecurityGroup.securityGroupId,
            SUBNETS: props.privateSubnets
                .map((subnet) => subnet.subnetId)
                .join(','),
            DOCDB_DATABASE_NAME: dbSecret
                .secretValueFromJson('dbName')
                .unsafeUnwrap(),
            DOCDB_MASTER_USERNAME: dbSecret
                .secretValueFromJson('username')
                .unsafeUnwrap(),
            DOCDB_MASTER_USER_PASSWORD: dbSecret
                .secretValueFromJson('password')
                .unsafeUnwrap()
        };

        const logging = new ecs.AwsLogDriver({
            streamPrefix: 'FarFlowLogging',
            logRetention: airflowTaskConfig.logRetention
        });

        const airflowImageAsset = new DockerImageAsset(
            this,
            'AirflowBuildImage',
            {
                directory: '../workflow-manager/airflow',
                platform: Platform.LINUX_AMD64
            }
        );

        const airflowTask = new ecs.FargateTaskDefinition(this, 'AirflowTask', {
            cpu: airflowTaskConfig.cpu,
            memoryLimitMiB: airflowTaskConfig.memoryLimitMiB
        });

        let workerTask = airflowTask;
        if (airflowTaskConfig.createWorkerPool) {
            workerTask = new ecs.FargateTaskDefinition(this, 'WorkerTask', {
                cpu: airflowTaskConfig.cpu,
                memoryLimitMiB: airflowTaskConfig.memoryLimitMiB
            });
        }

        const mmap = new Map();
        mmap.set(airflowTaskConfig.webserverConfig, airflowTask);
        mmap.set(airflowTaskConfig.schedulerConfig, airflowTask);
        mmap.set(airflowTaskConfig.workerConfig, workerTask);

        // Add containers to corresponding Tasks.
        for (const entry of mmap.entries()) {
            const containerInfo: ContainerConfig = entry[0];
            const task: ecs.FargateTaskDefinition = entry[1];

            task.addContainer(containerInfo.name, {
                image: ecs.ContainerImage.fromDockerImageAsset(
                    airflowImageAsset
                ),
                logging: logging,
                environment: ENV_VARS,
                entryPoint: [containerInfo.entryPoint],
                cpu: containerInfo.cpu,
                memoryLimitMiB: containerInfo.cpu
            }).addPortMappings({
                containerPort: containerInfo.containerPort
            });
        }

        new ServiceConstruct(this, 'AirflowService', {
            cluster: props.cluster,
            defaultVpcSecurityGroup: props.defaultVpcSecurityGroup,
            vpc: props.vpc,
            taskDefinition: airflowTask,
            isWorkerService: false
        });

        if (airflowTaskConfig.createWorkerPool) {
            new ServiceConstruct(this, 'WorkerService', {
                cluster: props.cluster,
                defaultVpcSecurityGroup: props.defaultVpcSecurityGroup,
                vpc: props.vpc,
                taskDefinition: workerTask,
                isWorkerService: true
            });
        }
    }
}
