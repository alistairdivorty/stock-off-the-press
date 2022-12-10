import { Construct } from 'constructs';
import {
    aws_ec2 as ec2,
    aws_efs as efs,
    aws_ecs as ecs,
    aws_logs as logs,
    RemovalPolicy
} from 'aws-cdk-lib';
import { AirflowDagTaskDefinition, EfsVolumeInfo } from './task-construct';

export interface DagTasksProps {
    readonly vpc: ec2.IVpc;
    readonly defaultVpcSecurityGroup: ec2.ISecurityGroup;
}

export class DagTasks extends Construct {
    constructor(scope: Construct, taskName: string, props: DagTasksProps) {
        super(scope, `${taskName}-TaskConstruct`);

        const logging = new ecs.AwsLogDriver({
            streamPrefix: 'FarFlowDagTaskLogging',
            logGroup: new logs.LogGroup(scope, 'FarFlowDagTaskLogs', {
                logGroupName: 'FarFlowDagTaskLogs',
                retention: logs.RetentionDays.ONE_DAY,
                removalPolicy: RemovalPolicy.DESTROY
            })
        });

        const sharedFS = new efs.FileSystem(this, 'EFSVolume', {
            vpc: props.vpc,
            securityGroup: props.defaultVpcSecurityGroup
        });
        sharedFS.connections.allowInternally(ec2.Port.tcp(2049));

        const efsVolumeInfo: EfsVolumeInfo = {
            containerPath: '/shared-volume',
            volumeName: 'SharedVolume',
            efsFileSystemId: sharedFS.fileSystemId
        };

        new AirflowDagTaskDefinition(this, 'FarFlowHelloTask', {
            containerInfo: {
                assetDir: '../workflow-manager/tasks/ecs_task',
                name: 'hello'
            },
            cpu: 256,
            memoryLimitMiB: 512,
            taskFamilyName: 'FarFlowHelloTask',
            logging: logging,
            efsVolumeInfo: efsVolumeInfo
        });
    }
}
