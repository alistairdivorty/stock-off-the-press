import { Construct } from 'constructs';
import { Stack, StackProps, Duration, aws_lambda as lambda } from 'aws-cdk-lib';
import { Platform } from 'aws-cdk-lib/aws-ecr-assets';

export class CrawlerStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        new lambda.DockerImageFunction(this, 'ft', {
            code: lambda.DockerImageCode.fromImageAsset(
                '../crawler-project/lambdas/ft',
                {
                    platform: Platform.LINUX_AMD64
                }
            ),
            memorySize: 1024,
            timeout: Duration.seconds(60)
        });
    }
}
