# Stock Off The Press

This monorepo contains an application for crawling sources of market news, a machine learning pipeline for predicting the effect of news stories on stock prices, a workflow manager for application orchestration, a web application for serving model inferences, and an application for provisioning the required cloud infrastructure.

- [Crawler](#1-crawler)
- [AWS CDK App](#5-aws-cdk-app)

## 1. Crawler

- [What It Does](#11-what-it-does)
- [Local Setup](#12-local-setup)
  - [Prerequisites](#121-prerequisites)
  - [Set Up Environment](#122-set-up-environment)
- [Directory Structure](#13-directory-structure)
- [Lambda Functions](#14-lambda-functions)
- [Run Crawl in Local Development Environment](#15-run-crawl-in-local-development-environment)
- [Deployment](#16-deployment)
- [Run Crawl in Production Environment](#17-run-crawl-in-production-environment)

### 1.1. What It Does

This application consists of Python classes – or “spiders” – that define how to crawl and extract structured data from the pages of websites that publish market news.

### 1.2. Local Setup

#### 1.2.1. Prerequisites

- [Conda package and environment manager](https://docs.conda.io/projects/conda/en/latest/)
- [Node.js JavaScript runtime environment](https://nodejs.org/en/download/)

#### 1.2.2. Set Up Environment

Start by installing the conda package and environment manager. The [Miniconda](https://docs.conda.io/en/latest/miniconda.html#) installer can be used to install a small, bootstrap version of Anaconda that includes only conda, Python, the packages they depend on, and a small number of other useful packages, including pip.

To create a fresh conda environment, run <code>conda create -n _env-name_ python=3.10</code>, substituting <code>_env-name_</code> with your desired environment name. Once the environment has been created, activate the environment by running <code>conda activate _env-name_</code>.

Install the Python dependencies by running `pip install -r requirements.txt` from the `crawler-project` directory. Install the Node dependencies by running `npm install` from the `crawler-project/lambdas` directory.

Set the necessary environment variables by modifying the command below as required depending on the location of your Miniconda installation and environment name.

<pre><code>conda env config vars set \
PYTHONPATH=<i>path/to/project/dir/crawler-project</i>:$HOME/miniconda3/envs/<i>env-name</i>/lib/python3.10/site-packages</code></pre>

Reactivate the environment by running <code>conda activate _env-name_</code>.

To create a file for storing environment variables, run `cp .env.example .env` from `crawler-project` directory.

### 1.3. Directory Structure

```
📦crawler-project
 ┣ 📂crawler
 ┃ ┣ 📂scripts
 ┃ ┃ ┣ 📜crawl.py
 ┃ ┃ ┗ 📜encrypt_data.py
 ┃ ┣ 📂spiders
 ┃ ┃ ┗ 📜ft.py
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

### 1.4. Lambda Functions

The session cookies used by spiders for authenticating user accounts are obtained by means of [Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-concepts.html#gettingstarted-concepts-function) that use the [Playwright](https://playwright.dev/) browser automation library to orchestrate instances of the Chromium browser running in headless mode. The JavaScript code that runs in [AWS Lambda](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html) using the Node runtime is contained in the `lambdas` directory. The subdirectory for each Lambda function contains a TypeScript file defining the function handler method, a `Dockerfile` for building the [deployment container image](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-images.html), and a shell script that is executed when the Docker container is started. To transcompile the TypeScript code into Lambda-compatible JavaScript, run `npm run build` from the `lambdas` directory. The [AWS CDK app](#5-aws-cdk-app) takes care of building and uploading the deployment container image. The constructs representing the Lambda functions are defined as part of the `CrawlerStack` stack.

### 1.5. Run Crawl in Local Development Environment

To initiate a crawl from your local machine, change the current working directory to `crawler-project` and run the command <code>scrapy crawl _spider-name_</code>, substituting <code>_spider-name_</code> with the name of the spider you want to run. Alternatively, start the crawler by executing `crawler/scripts/crawl.py`.

The optional parameter `year` can be used to specify the year within which an article must have been published for it to be processed by the spider. If no year is specified, the spider defaults to processing only the most recently published articles. If starting the crawler using the `scrapy crawl` command, a value for the `year` parameter can be supplied by passing the key–value pair <code>year=_dddd_</code> to the `—a` option. If starting the crawler using the `crawl.py` script, a value for the parameter can be passed as a command line argument.

The [Amazon DocumentDB](https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html) cluster that acts as the data store for this project is deployed within an [Amazon Virtual Private Cloud (VPC)](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html). The cluster can only be accessed directly by Amazon EC2 instances or other AWS services that are deployed within the same Amazon VPC. SSH tunneling (also known as port forwarding) can be used to access the DocumentDB cluster from outside the VPC. To create an SSH tunnel, you can connect to an EC2 instance running in the same VPC as the DocumentDB cluster that was provisioned specifically for this purpose.

As Transport Layer Security (TLS) is enabled on the cluster, you will need to download the public key for Amazon DocumentDB from https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem. The following operation downloads this file to the location specified by the `-P` option.

```
wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem -P $HOME/.ssh
```

Run the following command to set up an SSH tunnel to the DocumentDB cluster. The `-L` flag is used for forwarding a local port, in this case port `27018`.

<pre><code>
ssh -i <i>path/to/public/key/</i>ec2-key-pair.pem \
-L 27018:production.••••••.eu-west-1.docdb.amazonaws.com:27017 \
ec2-••••••.eu-west-1.compute.amazonaws.com -N</code></pre>

The connection URI for connecting an application to the DocumentDB cluster should be formatted as below.

<pre><code>mongodb://<i>username</i>:<i>password</i>@localhost:27018/<i>dbname</i>?tlsAllowInvalidHostnames=true&ssl=true&tlsCaFile=<i>path/to/public/key/</i>rds-combined-ca-bundle.pem&directConnection=true</code></pre>

### 1.6. Deployment

To deploy the crawler using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy`. See the [AWS CDK app](#5-aws-cdk-app) section for details of how to set up the AWS CDK Toolkit.

### 1.7. Run Crawl in Production Environment

For production crawls, the crawler is run as an [Amazon Elastic Container Service (ECS)](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html) task using the [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) serverless container orchestrator.

## 5. AWS CDK App
