import { Construct } from 'constructs';
import { aws_ecs as ecs, aws_iam as iam } from 'aws-cdk-lib';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';

export interface AirflowDagTaskDefinitionProps {
    readonly taskFamilyName: string;
    readonly containerInfo: ContainerInfo;
    readonly cpu: number;
    readonly memoryLimitMiB: number;
    readonly logging: ecs.LogDriver;
    readonly efsVolumeInfo?: EfsVolumeInfo;
}

export interface ContainerInfo {
    readonly name: string;
    readonly assetDir: string;
}

export interface EfsVolumeInfo {
    readonly volumeName: string;
    readonly efsFileSystemId: string;
    readonly containerPath: string;
}

export class AirflowDagTaskDefinition extends Construct {
    constructor(
        scope: Construct,
        taskName: string,
        props: AirflowDagTaskDefinitionProps
    ) {
        super(scope, `${taskName}-TaskConstruct`);

        const workerTask = new ecs.FargateTaskDefinition(
            this,
            `${taskName}-TaskDef`,
            {
                cpu: props.cpu,
                memoryLimitMiB: props.memoryLimitMiB,
                family: props.taskFamilyName
            }
        );

        if (props.efsVolumeInfo) {
            workerTask.addVolume({
                name: props.efsVolumeInfo.volumeName,
                efsVolumeConfiguration: {
                    fileSystemId: props.efsVolumeInfo.efsFileSystemId
                }
            });

            workerTask.taskRole.addManagedPolicy(
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'AmazonElasticFileSystemClientReadWriteAccess'
                )
            );
        }

        const workerImageAsset = new DockerImageAsset(
            this,
            `${props.containerInfo.name}-BuildImage`,
            {
                directory: props.containerInfo.assetDir,
                platform: Platform.LINUX_AMD64
            }
        );

        const container = workerTask.addContainer(props.containerInfo.name, {
            image: ecs.ContainerImage.fromDockerImageAsset(workerImageAsset),
            logging: props.logging
        });

        if (props.efsVolumeInfo) {
            container.addMountPoints({
                containerPath: props.efsVolumeInfo.containerPath,
                sourceVolume: props.efsVolumeInfo.volumeName,
                readOnly: false
            });
        }
    }
}
