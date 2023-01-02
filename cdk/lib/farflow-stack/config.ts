import { aws_logs as logs } from 'aws-cdk-lib';

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
    cpu: 1024,
    memoryLimitMiB: 5120,
    webserverConfig: defaultWebserverConfig,
    schedulerConfig: defaultSchedulerConfig,
    workerConfig: defaultWorkerConfig,
    logRetention: logs.RetentionDays.ONE_DAY
    // Uncomment to have dedicated worker pool that can be auto-scaled as per workerAutoScalingConfig.
    // createWorkerPool: true
};
