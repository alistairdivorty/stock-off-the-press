import { Construct } from 'constructs';
import {
    CustomResource,
    Duration,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_logs as logs,
    custom_resources as cr,
    aws_lambda as lambda
} from 'aws-cdk-lib';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

export interface PostgresCreateDatabaseProps {
    vpcId: string;
    dbName: string;
    secretName: string;
    userKey: string;
    passwordKey: string;
    host: string;
    port: Number;
}

export class PostgresCreateDatabase extends Construct {
    public readonly response: string;

    constructor(
        scope: Construct,
        id: string,
        props: PostgresCreateDatabaseProps
    ) {
        super(scope, id);

        const onEvent = new lambda.SingletonFunction(
            this,
            'PostgresCreateDatabaseSingleton',
            {
                uuid: 'e4b45d14-9b34-4b09-a94e-16aadd256570',
                code: lambda.Code.fromAssetImage(__dirname, {
                    platform: Platform.LINUX_AMD64
                }),
                handler: lambda.Handler.FROM_IMAGE,
                timeout: Duration.minutes(6),
                runtime: lambda.Runtime.FROM_IMAGE,
                role: new iam.Role(this, 'PostgresCreateDatabaseLambdaRole', {
                    assumedBy: new iam.CompositePrincipal(
                        new iam.ServicePrincipal('lambda.amazonaws.com')
                    ),
                    managedPolicies: [
                        iam.ManagedPolicy.fromAwsManagedPolicyName(
                            'service-role/AWSLambdaBasicExecutionRole'
                        ),
                        iam.ManagedPolicy.fromAwsManagedPolicyName(
                            'service-role/AWSLambdaVPCAccessExecutionRole'
                        ),
                        iam.ManagedPolicy.fromAwsManagedPolicyName(
                            'SecretsManagerReadWrite'
                        ),
                        iam.ManagedPolicy.fromAwsManagedPolicyName(
                            'AmazonRDSFullAccess'
                        )
                    ]
                }),
                vpc: ec2.Vpc.fromLookup(this, 'vpc', {
                    vpcId: props.vpcId
                }),
                vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
            }
        );

        const myProvider = new cr.Provider(
            this,
            'PostgresCreateDatabaseProvider',
            {
                onEventHandler: onEvent,
                // isCompleteHandler: isComplete,        // optional async "waiter" lambda
                logRetention: logs.RetentionDays.ONE_DAY
            }
        );

        const resource = new CustomResource(
            this,
            'PostgresCreateDatabaseResource',
            {
                serviceToken: myProvider.serviceToken,
                properties: props
            }
        );

        this.response = resource.getAtt('Response').toString();
    }
}
