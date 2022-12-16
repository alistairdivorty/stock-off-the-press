import { aws_ec2 as ec2, aws_logs as logs } from 'aws-cdk-lib';
import { DBConfig } from './constructs/rds';

export interface AirflowTaskConfig {
    readonly cpu: number;
    readonly memoryLimitMiB: number;
    readonly webserverConfig: ContainerConfig;
    readonly schedulerConfig: ContainerConfig;
    readonly workerConfig: ContainerConfig;
    readonly logRetention: logs.RetentionDays;
    readonly createWorkerPool?: boolean;
}

export interface AutoScalingConfig {
    readonly maxTaskCount: number;
    readonly minTaskCount: number;
    readonly cpuUsagePercent?: number;
    readonly memUsagePercent?: number;
}

export interface ContainerConfig {
    readonly name: string;
    readonly cpu?: number;
    readonly memoryLimitMiB?: number;
    readonly containerPort: number;
    readonly entryPoint: string;
}

export const workerAutoScalingConfig: AutoScalingConfig = {
    minTaskCount: 1,
    maxTaskCount: 5,
    cpuUsagePercent: 70
};

export const defaultWebserverConfig: ContainerConfig = {
    name: 'WebserverContainer',
    containerPort: 8080,
    entryPoint: '/webserver_entry.sh'
};

export const defaultSchedulerConfig: ContainerConfig = {
    name: 'SchedulerContainer',
    containerPort: 8081,
    entryPoint: '/scheduler_entry.sh'
};

export const defaultWorkerConfig: ContainerConfig = {
    name: 'WorkerContainer',
    containerPort: 8082,
    entryPoint: '/worker_entry.sh'
};

export const airflowTaskConfig: AirflowTaskConfig = {
    cpu: 512,
    memoryLimitMiB: 3072,
    webserverConfig: defaultWebserverConfig,
    schedulerConfig: defaultSchedulerConfig,
    workerConfig: defaultWorkerConfig,
    logRetention: logs.RetentionDays.ONE_DAY
    // Uncomment to have dedicated worker pool that can be auto-scaled as per workerAutoScalingConfig.
    // createWorkerPool: true
};

export const defaultDBConfig: DBConfig = {
    dbName: 'farflow',
    port: 5432,
    masterUsername: 'airflow',
    instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
    ),
    allocatedStorageInGB: 5,
    backupRetentionInDays: 5
};
