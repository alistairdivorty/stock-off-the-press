import { Construct } from 'constructs';
import {
    Duration,
    CfnOutput,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_elasticloadbalancingv2 as elbv2
} from 'aws-cdk-lib';

import { PolicyConstruct } from '../policies';
import { workerAutoScalingConfig } from '../config';

export interface ServiceConstructProps {
    readonly vpc: ec2.IVpc;
    readonly cluster: ecs.ICluster;
    readonly defaultVpcSecurityGroup: ec2.ISecurityGroup;
    readonly taskDefinition: ecs.FargateTaskDefinition;
    readonly isWorkerService?: boolean;
}

export class ServiceConstruct extends Construct {
    private readonly fargateService: ecs.FargateService;
    public readonly loadBalancerDnsName?: CfnOutput;

    constructor(parent: Construct, name: string, props: ServiceConstructProps) {
        super(parent, name);

        const policies = new PolicyConstruct(this, 'AirflowTaskPolicies');
        if (policies.managedPolicies) {
            policies.managedPolicies.forEach((managedPolicy) =>
                props.taskDefinition.taskRole.addManagedPolicy(managedPolicy)
            );
        }

        if (policies.policyStatements) {
            policies.policyStatements.forEach((policyStatement) =>
                props.taskDefinition.taskRole.addToPrincipalPolicy(
                    policyStatement
                )
            );
        }

        this.fargateService = new ecs.FargateService(this, name, {
            cluster: props.cluster,
            taskDefinition: props.taskDefinition,
            securityGroups: [props.defaultVpcSecurityGroup],
            platformVersion: ecs.FargatePlatformVersion.VERSION1_4
        });

        const allowedPorts = new ec2.Port({
            protocol: ec2.Protocol.TCP,
            fromPort: 0,
            toPort: 65535,
            stringRepresentation: 'All'
        });

        this.fargateService.connections.allowFromAnyIpv4(allowedPorts);

        if (props.isWorkerService) {
            this.configureAutoScaling();
        } else {
            // Export Load Balancer DNS Name, which will be used to access Airflow UI.
            this.loadBalancerDnsName = new CfnOutput(
                this,
                'LoadBalancerDNSName',
                {
                    value: this.attachLoadBalancer(props.vpc),
                    exportName: 'LoadBalancerDNSName'
                }
            );
        }
    }

    private attachLoadBalancer(vpc: ec2.IVpc): string {
        const loadBalancer = new elbv2.NetworkLoadBalancer(
            this,
            'NetworkLoadBalancer',
            {
                vpc: vpc,
                internetFacing: true,
                crossZoneEnabled: true
            }
        );

        const listener = loadBalancer.addListener('Listener', {
            port: 80
        });

        const targetGroup = listener.addTargets(
            'AirflowFargateServiceTargetGroup',
            {
                healthCheck: {
                    port: 'traffic-port',
                    protocol: elbv2.Protocol.HTTP,
                    path: '/health'
                },
                port: 80,
                targets: [this.fargateService]
            }
        );
        targetGroup.setAttribute('deregistration_delay.timeout_seconds', '60');

        return loadBalancer.loadBalancerDnsName;
    }

    private configureAutoScaling(): void {
        const scaling = this.fargateService.autoScaleTaskCount({
            maxCapacity: workerAutoScalingConfig.maxTaskCount,
            minCapacity: workerAutoScalingConfig.minTaskCount
        });

        if (workerAutoScalingConfig.cpuUsagePercent) {
            scaling.scaleOnCpuUtilization('CpuScaling', {
                targetUtilizationPercent:
                    workerAutoScalingConfig.cpuUsagePercent,
                scaleInCooldown: Duration.seconds(60),
                scaleOutCooldown: Duration.seconds(60)
            });
        }

        if (workerAutoScalingConfig.memUsagePercent) {
            scaling.scaleOnMemoryUtilization('MemoryScaling', {
                targetUtilizationPercent:
                    workerAutoScalingConfig.memUsagePercent,
                scaleInCooldown: Duration.seconds(60),
                scaleOutCooldown: Duration.seconds(60)
            });
        }
    }
}
