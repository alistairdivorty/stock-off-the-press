import { Construct } from 'constructs';
import { aws_iam as iam } from 'aws-cdk-lib';

export class PolicyConstruct extends Construct {
    public readonly policyStatements?: iam.PolicyStatement[];
    public readonly managedPolicies?: iam.IManagedPolicy[];

    constructor(app: Construct, name: string) {
        super(app, name);

        // Managed policies and policy statements will be attached to Task Role of Airflow Instance.
        this.managedPolicies = [
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSQSFullAccess'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECS_FullAccess'),
            iam.ManagedPolicy.fromAwsManagedPolicyName(
                'AmazonElasticFileSystemClientReadWriteAccess'
            ),
            iam.ManagedPolicy.fromAwsManagedPolicyName(
                'CloudWatchLogsFullAccess'
            ),
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'),
            iam.ManagedPolicy.fromAwsManagedPolicyName('IAMFullAccess')
        ];

        this.policyStatements = [
            new iam.PolicyStatement({
                actions: ['emr-serverless:*'],
                effect: iam.Effect.ALLOW,
                resources: ['*']
            }),
            new iam.PolicyStatement({
                actions: ['glue:*'],
                effect: iam.Effect.ALLOW,
                resources: ['*']
            })
        ];
    }
}
