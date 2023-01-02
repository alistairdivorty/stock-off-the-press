#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CrawlerStack } from '../lib/crawler-stack';
import { VPCStack } from '../lib/vpc-stack';
import { DocDBStack } from '../lib/docdb-stack';
import { RDSStack } from '../lib/rds-stack';
import { EMRServerlessStack } from '../lib/emr-serverless-stack';
import { FarFlowStack } from '../lib/farflow-stack/farflow-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();

const env: cdk.Environment = {
    account: process.env.AWS_ACCOUNT_ID,
    region: 'eu-west-1'
};

new VPCStack(app, 'VPCStack');

new CrawlerStack(app, 'CrawlerStack', { env });

new DocDBStack(app, 'DocDBStack', { env });

new RDSStack(app, 'RDSStack', { env });

new EMRServerlessStack(app, 'EMRServerlessStack', { env });

new FarFlowStack(app, 'FarFlowStack', { env });
