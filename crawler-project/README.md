## Crawler

- [What It Does](#1-what-it-does)
- [Local Setup](#2-local-setup)
  - [Prerequisites](#21-prerequisites)
  - [Set Up Environment](#22-set-up-environment)
- [Directory Structure](#3-directory-structure)
- [Lambda Functions](#4-lambda-functions)
- [Run Crawl in Local Development Environment](#5-run-crawl-in-local-development-environment)
- [Deployment](#6-deployment)
- [Run Crawl in Production Environment](#7-run-crawl-in-production-environment)

### 1. What It Does

This application consists of Python classes – or “spiders” – that define how to crawl and extract structured data from the pages of websites that publish market news.

### 2. Local Setup

#### 2.1. Prerequisites

- [Conda package and environment manager](https://docs.conda.io/projects/conda/en/latest/)
- [Node.js JavaScript runtime environment](https://nodejs.org/en/download/)

#### 2.2. Set Up Environment

Start by installing the conda package and environment manager. The [Miniconda](https://docs.conda.io/en/latest/miniconda.html#) installer can be used to install a small, bootstrap version of Anaconda that includes only conda, Python, the packages they depend on, and a small number of other useful packages, including pip.

To create a fresh conda environment, run `conda create -n <env-name> python=3.10`, substituting `<env-name>` with your desired environment name. Once the environment has been created, activate the environment by running `conda activate <env-name>`.

Install the Python dependencies by running `pip install -r requirements.txt` from the `crawler-project` directory. Install the Node dependencies by running `npm install` from the `crawler-project/lambdas` directory.

Set the necessary environment variables by modifying the command below as required depending on the location of your Miniconda installation and environment name.

```shell
conda env config vars set \
PYTHONPATH=<path/to/project/dir>/crawler-project:$HOME/opt/miniconda3/envs/<env-name>/lib/python3.10/site-packages
```

Reactivate the environment by running `conda activate <env-name>`.

To create a file for storing environment variables, run `cp .env.example .env` from the `crawler-project` directory.

### 3. Directory Structure

```
📦crawler-project
 ┣ 📂crawler
 ┃ ┣ 📂scripts
 ┃ ┃ ┣ 📜crawl.py
 ┃ ┃ ┗ 📜encrypt_data.py
 ┃ ┣ 📂spiders
 ┃ ┃ ┣ 📜exchange.py
 ┃ ┃ ┣ 📜ft.py
 ┃ ┃ ┗ 📜price.py
 ┃ ┣ 📜form_payloads.py
 ┃ ┣ 📜items.py
 ┃ ┣ 📜log_formatter.py
 ┃ ┣ 📜middlewares.py
 ┃ ┣ 📜pipelines.py
 ┃ ┗ 📜settings.py
 ┣ 📂lambdas
 ┃ ┣ 📂ft
 ┃ ┃ ┣ 📜Dockerfile
 ┃ ┃ ┣ 📜entrypoint.sh
 ┃ ┃ ┣ 📜index.ts
 ┃ ┃ ┗ 📂node_modules
 ┃ ┣ 📜.eslintrc.json
 ┃ ┣ 📜.gitignore
 ┃ ┣ 📜.prettierrc
 ┃ ┣ 📜package-lock.json
 ┃ ┣ 📜package.json
 ┃ ┗ 📜tsconfig.json
 ┣ 📜.env
 ┣ 📜.env.example
 ┣ 📜.gitignore
 ┣ 📜Dockerfile
 ┣ 📜entrypoint.sh
 ┣ 📜production.env
 ┣ 📜requirements.txt
 ┗ 📜scrapy.cfg
```

### 4. Lambda Functions

The session cookies used by spiders for authenticating user accounts are obtained by means of [Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-concepts.html#gettingstarted-concepts-function) that use the [Playwright](https://playwright.dev/) browser automation library to orchestrate instances of the Chromium browser running in headless mode. The JavaScript code that runs in [AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html) using the Node runtime is contained in the `lambdas` directory. The subdirectory for each Lambda function contains a TypeScript file defining the function handler method, a `Dockerfile` for building the [deployment container image](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-images.html), and a shell script that is executed when the Docker container is started. To transcompile the TypeScript code into Lambda-compatible JavaScript, run `npm run build` from the `lambdas` directory. The [AWS CDK app](#6-aws-cdk-app) takes care of building and uploading the deployment container image. The constructs representing the Lambda functions are defined as part of the `CrawlerStack` stack.

### 5. Run Crawl in Local Development Environment

To initiate a crawl from your local machine, change the current working directory to `crawler-project` and run the command `scrapy crawl <spider-name>`, substituting `<spider-name>` with the name of the spider you want to run. Alternatively, start the crawler by executing `crawler/scripts/crawl.py`.

The optional parameter `year` can be used to specify the year within which an article must have been published for it to be processed by the spider. If no year is specified, the spider defaults to processing only the most recently published articles. If starting the crawler using the `scrapy crawl` command, a value for the `year` parameter can be supplied by passing the key–value pair `year=<yyyy>` to the `—a` option. If starting the crawler using the `crawl.py` script, a value for the parameter can be passed as a command line argument.

The [Amazon DocumentDB](https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html) cluster that acts as the data store for this project is deployed within an [Amazon Virtual Private Cloud (VPC)](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html). The cluster can only be accessed directly by [Amazon EC2](https://aws.amazon.com/ec2/getting-started/) instances or other AWS services that are deployed within the same Amazon VPC. SSH tunneling (also known as port forwarding) can be used to access the DocumentDB cluster from outside the VPC. To create an SSH tunnel, you can connect to an [EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instances-and-amis.html#instances) running in the same VPC as the DocumentDB cluster that was provisioned specifically for this purpose.

As Transport Layer Security (TLS) is enabled on the cluster, you will need to download the public key for Amazon DocumentDB from https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem. The following operation downloads this file to the location specified by the `-P` option.

```shell
wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem -P $HOME/.ssh
```

Run the following command to set up an SSH tunnel to the DocumentDB cluster. The `-L` flag is used for forwarding a local port, in this case port `27017`.

```bash
ssh -i $HOME/.ssh/ec2-key-pair.pem \
-L 27017:production.••••••.eu-west-1.docdb.amazonaws.com:27017 \
ec2-••••••.eu-west-1.compute.amazonaws.com -N
```

The connection URI for connecting the application to the DocumentDB cluster should be formatted as below.

```
mongodb://<username>:<password>@localhost:27017/stock-press?tlsAllowInvalidHostnames=true&ssl=true&tlsCaFile=$HOME/.ssh/rds-combined-ca-bundle.pem&directConnection=true&retryWrites=false
```

### 6. Deployment

To deploy the crawler using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy CrawlerStack`. See the [AWS CDK app](../README.md#6-aws-cdk-app) section of the main README for details of how to set up the AWS CDK Toolkit.

### 7. Run Crawl in Production Environment

For production crawls, the crawler is run as an [Amazon Elastic Container Service (ECS)](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html) task using the [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) serverless container orchestrator. To run an ECS task using the [AWS Command Line Interface](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html), run the following command, substituting `<cluster-name>`, `<task-definition-name>`, `<vpc-public-subnet-id>` and `<service-security-group-id>` with the values outputted by the [AWS CDK app](#6-aws-cdk-app) after deployment. The example below shows how to override the default command for a container specified in the Docker image with a command that specifies a year within which an article must have been published for it to be processed by the spider.

```shell
aws ecs run-task \
    --launch-type FARGATE \
    --cluster arn:aws:ecs:eu-west-1:••••••:cluster/<cluster-name> \
    --task-definition <task-definition-name> \
    --network-configuration 'awsvpcConfiguration={subnets=[<vpc-public-subnet-id>],securityGroups=[<service-security-group-id>],assignPublicIp=ENABLED}' \
    --overrides '{
        "containerOverrides": [
            {
                "name": "<container-name>",
                "command": ["sh", "-c", "python3 ./crawler/scripts/crawl.py <yyyy>"]
            }
        ]
    }'
```
