#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CrawlerStack } from '../lib/crawler-stack';
import { VPCStack } from '../lib/vpc-stack';
import { DocDBStack } from '../lib/docdb-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();
new VPCStack(app, 'VPCStack');
new CrawlerStack(app, 'CrawlerStack', {
    env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: 'eu-west-1'
    }
});
new DocDBStack(app, 'DocDBStack', {
    env: {
        account: process.env.AWS_ACCOUNT_ID,
        region: 'eu-west-1'
    }
});
