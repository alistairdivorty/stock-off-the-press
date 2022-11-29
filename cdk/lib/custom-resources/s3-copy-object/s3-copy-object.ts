import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as fs from 'fs';
import * as path from 'path';

export interface S3CopyObjectProps {
    Bucket: string;
    CopySource: string;
    Key: string;
}

export class S3CopyObject extends Construct {
    public readonly response: string;

    constructor(scope: Construct, id: string, props: S3CopyObjectProps) {
        super(scope, id);

        const onEvent = new lambda.SingletonFunction(
            this,
            'S3CopyObjectSingleton',
            {
                uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
                code: new lambda.InlineCode(
                    fs.readFileSync(
                        path.join(__dirname, 's3-copy-object-handler.py'),
                        {
                            encoding: 'utf-8'
                        }
                    )
                ),
                handler: 'index.on_event',
                timeout: cdk.Duration.minutes(6),
                runtime: lambda.Runtime.PYTHON_3_9,
                role: new iam.Role(this, 'S3CopyObjectLambdaRole', {
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
                            'AmazonS3FullAccess'
                        )
                    ]
                })
            }
        );

        const myProvider = new cr.Provider(this, 'S3CopyObjectProvider', {
            onEventHandler: onEvent,
            // isCompleteHandler: isComplete,        // optional async "waiter" lambda
            logRetention: logs.RetentionDays.ONE_DAY
        });

        const resource = new cdk.CustomResource(this, 'S3CopyObjectResource', {
            serviceToken: myProvider.serviceToken,
            properties: props
        });

        this.response = resource.getAtt('Response').toString();
    }
}
