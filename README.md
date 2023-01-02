# Stock Off The Press

This monorepo contains an application for crawling sources of market news, a machine learning pipeline for predicting the effect of news stories on stock prices, a workflow manager for application orchestration, a web application for serving model inferences, and an application for provisioning the required cloud infrastructure.

- [Crawler](#1-crawler)
- [ML Pipeline](#2-ml-pipeline)
- [Workflow Manager](#3-workflow-manager)
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

To create a fresh conda environment, run `conda create -n <env-name> python=3.10`, substituting `<env-name>` with your desired environment name. Once the environment has been created, activate the environment by running `conda activate <env-name>`.

Install the Python dependencies by running `pip install -r requirements.txt` from the `crawler-project` directory. Install the Node dependencies by running `npm install` from the `crawler-project/lambdas` directory.

Set the necessary environment variables by modifying the command below as required depending on the location of your Miniconda installation and environment name.

```shell
conda env config vars set \
PYTHONPATH=<path/to/project/dir>/crawler-project:$HOME/opt/miniconda3/envs/<env-name>/lib/python3.10/site-packages
```

Reactivate the environment by running `conda activate <env-name>`.

To create a file for storing environment variables, run `cp .env.example .env` from the `crawler-project` directory.

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

### 1.6. Deployment

To deploy the crawler using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy CrawlerStack`. See the [AWS CDK app](#5-aws-cdk-app) section for details of how to set up the AWS CDK Toolkit.

### 1.7. Run Crawl in Production Environment

For production crawls, the crawler is run as an [Amazon Elastic Container Service (ECS)](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html) task using the [AWS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html) serverless container orchestrator. To run an ECS task using the [AWS Command Line Interface](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html), run the following command, substituting `<cluster-name>`, `<task-definition-name>`, `<vpc-public-subnet-id>` and `<service-security-group-id>` with the values outputted by the [AWS CDK app](#5-aws-cdk-app) after deployment. The example below shows how to override the default command for a container specified in the Docker image with a command that specifies a year within which an article must have been published for it to be processed by the spider.

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

## 2. ML Pipeline

- [What It Does](#21-what-it-does)
- [Local Setup](#22-local-setup)
  - [Prerequisites](#221-prerequisites)
  - [Set Up Environment](#222-set-up-environment)
- [Testing](#23-testing)
- [Directory Structure](#24-directory-structure)
- [Start a `SparkSession`](#25-starting-a-sparksession)
- [Run Job in Local Development Environment](#26-run-job-in-local-development-environment)
- [Deployment](#27-deployment)
  - [Packaging Dependencies](#271-packaging-dependencies)
  - [Deploy CloudFormation Stack](#272-deploy-cloudformation-stack)
- [Run Job in Production Environment](#28-run-job-in-production-environment)

### 2.1. What It Does

This is an application for performing distributed batch processing of ML workloads on the [Apache Spark](https://spark.apache.org/) framework.

### 2.2. Local Setup

#### 2.2.1. Prerequisites

- [Conda package and environment manager](https://docs.conda.io/projects/conda/en/latest/)
- [OpenJDK 11](https://adoptopenjdk.net/releases.html)

#### 2.2.2 Set up environment

Start by installing the conda package and environment manager. The [Miniconda](https://docs.conda.io/en/latest/miniconda.html#) installer can be used to install a small, bootstrap version of Anaconda that includes only conda, Python, the packages they depend on, and a small number of other useful packages, including pip.

To create a fresh conda environment, run `conda create -n <env-name> python=3.10`, substituting `<env-name>` with your desired environment name. Once the environment has been created, activate the environment by running `conda activate <env-name>`.

Next, install the project dependencies, including distributions of [Apache Hadoop](https://hadoop.apache.org/) and [Apache Spark](https://spark.apache.org/), by running `pip install -r requirements_dev.txt` from the `ml-pipeline` directory.

Set the necessary environment variables by modifying the command below as required depending on the location of your Miniconda installation and environment name.

```shell
conda env config vars set \
PYTHONPATH=<path/to/project/dir>/ml-pipeline:$HOME/opt/miniconda3/envs/<env-name>/lib/python3.10/site-packages \
SPARK_HOME=$HOME/opt/miniconda3/envs/<env-name>/lib/python3.10/site-packages/pyspark \
PYSPARK_PYTHON=$HOME/opt/miniconda3/envs/<env-name>/bin/python \
PYSPARK_DRIVER_PYTHON=$HOME/opt/miniconda3/envs/<env-name>/bin/python \
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
```

Reactivate the environment by running `conda activate <env-name>`.

To create a file for storing environment variables, run `cp .env.example .env`.

To download model files needed for local inference, run `docker build -f assets.Dockerfile -o . .`. Model files will be outputted to the `assets/models` directory.

### 2.3. Testing

This project uses the [pytest](https://docs.pytest.org/en/7.1.x/) software testing framework. Run `DEBUG=1 pytest` to execute all tests. Use the `-s` flag to prevent pytest from capturing data written to STDOUT, and the `-v` flag to increase the verbosity of test output.

### 2.4. Directory Structure

```
📦ml-pipeline
 ┣ 📂artifacts
 ┃ ┣ 📜packages.tar.gz
 ┃ ┗ 📜uber-JAR.jar
 ┣ 📂assets
 ┃ ┗ 📂models
 ┃ ┃ ┣ 📂bert_large_token_classifier_conll03_en
 ┃ ┃ ┣ 📂facebook_bart_large_cnn
 ┃ ┃ ┗ 📂sentence_detector_dl_xx
 ┣ 📂config
 ┣ 📂inference
 ┃ ┣ 📂services
 ┃ ┃ ┣ 📜logger.py
 ┃ ┃ ┗ 📜spark.py
 ┃ ┣ 📂transformers
 ┃ ┃ ┣ 📜named_entity_recognizer.py
 ┃ ┃ ┗ 📜summarizer.py
 ┃ ┗ 📜summarizer.py
 ┣ 📂jobs
 ┃ ┗ 📜summarization.py
 ┣ 📂scripts
 ┃ ┣ 📜download_models.py
 ┃ ┗ 📜package_models.py
 ┣ 📂tests
 ┃ ┣ 📜conftest.py
 ┃ ┣ 📜fixtures.py
 ┃ ┣ 📜ner_test.py
 ┃ ┗ 📜summarization_test.py
 ┣ 📜.env
 ┣ 📜.env.example
 ┣ 📜.gitignore
 ┣ 📜artifacts.Dockerfile
 ┣ 📜assets.Dockerfile
 ┣ 📜pom.xml
 ┣ 📜pyproject.toml
 ┣ 📜pytest.ini
 ┣ 📜requirements.txt
 ┗ 📜requirements_dev.txt
```

The `jobs` directory contains Python scripts that can be sent to a Spark cluster and executed as jobs. The `inference` directory contains the custom [Transformers](https://spark.apache.org/docs/latest/ml-pipeline.html#transformers) and [MLflow Python model](https://www.mlflow.org/docs/latest/python_api/mlflow.pyfunc.html) classes that provide the core functionality.

### 2.5. Starting a `SparkSession`

The `inference.services.spark` module provides a `start_spark` function for creating a [SparkSession](https://spark.apache.org/docs/latest/sql-getting-started.html#starting-point-sparksession) on the worker node and registering an application with the cluster. The following example shows how to create a `SparkSession` and specify the [Maven coordinates](https://maven.apache.org/pom.html#Maven_Coordinates) of [JAR](https://docs.oracle.com/javase/8/docs/technotes/guides/jar/jarGuide.html) files to be downloaded and transferred to the cluster.

```python
from inference.services.spark import start_spark

spark, log, config = start_spark(
    jars_packages=[
        "org.apache.hadoop:hadoop-aws:3.3.2",
        "org.mongodb.spark:mongo-spark-connector_2.12:3.0.2",
        f"com.johnsnowlabs.nlp:spark-nlp_2.12:4.2.1",
    ],
    spark_config={
        "spark.mongodb.input.uri": os.environ["MONGODB_CONNECTION_URI"],
        "spark.mongodb.output.uri": os.environ["MONGODB_CONNECTION_URI"],
        "fs.s3a.aws.credentials.provider": "com.amazonaws.auth.DefaultAWSCredentialsProviderChain",
        "spark.kryoserializer.buffer.max": "2000M",
        "spark.driver.memory": "10g",
    },
)
```

Note that only the `app_name` argument will take effect when calling `start_spark` from a job submitted to a cluster via the `spark-submit` script in Spark's `bin` directory. The purpose of the other arguments is to facilitate local development and testing from within an interactive terminal session or Python console. The `start_spark` function detects the execution environment in order to determine which arguments the session builder should use – the function arguments or the `spark-submit` arguments. The `config` dictionary is populated with configuration values contained in JSON files located at paths specified by the `files` argument or `--files` option. The top level keys of the `config` dictionary correspond to the names of the JSON files submitted to the cluster.

### 2.6. Run Job in Local Development Environment

The following example shows how to submit a job to a local standalone Spark cluster, specify the [Maven coordinates](https://maven.apache.org/pom.html#Maven_Coordinates) of [JAR](https://docs.oracle.com/javase/8/docs/technotes/guides/jar/jarGuide.html) files to be downloaded and transferred to the cluster, and supply configuration values to the `SparkConf` object that will be passed to the `SparkContext`.

```shell
$SPARK_HOME/bin/spark-submit \
--master "local[*]" \
--packages "org.apache.hadoop:hadoop-aws:3.3.2,org.mongodb.spark:mongo-spark-connector_2.12:3.0.2,com.johnsnowlabs.nlp:spark-nlp-m1_2.12:4.2.1" \
--conf "spark.mongodb.input.uri=mongodb://<username>:<password>@localhost:27017/stock-press?tlsAllowInvalidHostnames=true&ssl=true&directConnection=true&retryWrites=false" \
--conf "spark.mongodb.output.uri=mongodb://<username>:<password>@localhost:27017/stock-press?tlsAllowInvalidHostnames=true&ssl=true&directConnection=true&retryWrites=false" \
--conf "fs.s3a.aws.credentials.provider=com.amazonaws.auth.DefaultAWSCredentialsProviderChain" \
--conf "spark.driver.memory=10g" \
--conf "spark.kryoserializer.buffer.max=2000M" \
jobs/summarization.py
```

The [Amazon DocumentDB](https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html) cluster that acts as the data store for this project is deployed within an [Amazon Virtual Private Cloud (VPC)](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html). The cluster can only be accessed directly by [Amazon EC2](https://aws.amazon.com/ec2/getting-started/) instances or other AWS services that are deployed within the same Amazon VPC. SSH tunneling (also known as port forwarding) can be used to access the DocumentDB cluster from outside the VPC. To create an SSH tunnel, you can connect to an [EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instances-and-amis.html#instances) running in the same VPC as the DocumentDB cluster that was provisioned specifically for this purpose.

As Transport Layer Security (TLS) is enabled on the cluster, you will need to download the public key for Amazon DocumentDB from https://s3.amazonaws.com/rds-downloads/rds-ca-2019-root.pem. The following operation downloads this file to the location specified by the `-P` option.

```shell
wget https://s3.amazonaws.com/rds-downloads/rds-ca-2019-root.pem -P $HOME/.ssh
```

Run the following command to add the public key to the Java TrustStore.

```shell
sudo keytool -import -alias RDS -file $HOME/.ssh/rds-ca-2019-root.pem -cacerts
```

Run the following command to set up an SSH tunnel to the DocumentDB cluster. The `-L` flag is used for forwarding a local port, in this case port `27017`.

```bash
ssh -i $HOME/.ssh/ec2-key-pair.pem \
-L 27017:production.••••••.eu-west-1.docdb.amazonaws.com:27017 \
ec2-••••••.eu-west-1.compute.amazonaws.com -N
```

The connection URI for connecting the application to the DocumentDB cluster should be formatted as below.

```
mongodb://<username>:<password>@localhost:27017/stock-press?tlsAllowInvalidHostnames=true&ssl=true&directConnection=true&retryWrites=false
```

### 2.7. Deployment

#### 2.7.1. Packaging Dependencies

The project includes a Dockerfile with instructions for packaging dependencies into archives that can be uploaded to [Amazon S3](https://aws.amazon.com/s3/) and downloaded to Spark executors. Dependencies can be packaged for deployment by running the command `docker build -f artifacts.Dockerfile -o . .`. A TAR archive containing the Python dependencies and an uber-JAR containing the Java dependencies will be outputted to a directory named `artifacts`.

The project also includes a Dockerfile with instructions for fetching model files that must be uploaded to Amazon S3 and downloaded to Spark executors. Model files can be readied for deployment by running the command `docker build -f assets.Dockerfile -o . .`. Model files will be outputted to the directory `assets/models`.

#### 2.7.2 Deploy CloudFormation Stack

To deploy the crawler using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy EMRServerlessStack`. See the [AWS CDK app](#5-aws-cdk-app) section for details of how to set up the AWS CDK Toolkit. The AWS CDK app takes care of uploading the deployment artifacts and assets to the project's dedicated S3 bucket. The app also creates and uploads a JSON configuration file named `models.json` that specifies the S3 URI for the `models` folder. For production job runs, this file needs to be submitted to the Spark cluster by passing the URI as an argument to the `--files` option. The AWS CDK app outputs the ID of the EMR Serverless application created by the CloudFormation stack, along with the [ARN](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html) for the [IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) execution role, S3 URIs for the `jobs`, `config`, `artifacts`, `models` and `logs` folders, and the S3 URI for the ZIP archive containing a custom Java KeyStore.

### 2.8. Run Job in Production Environment

The following is an example of how to submit a job to the [EMR Serverless](https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/emr-serverless.html) application deployed by the [AWS CDK app](#5-aws-cdk-app) using the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-welcome.html). The placeholder values should be replaced with the values outputted by the CDK app after deployment.

```shell
aws emr-serverless start-job-run \
    --execution-timeout-minutes 10 \
    --region eu-west-1 \
    --application-id <application-ID> \
    --execution-role-arn <role-ARN> \
    --job-driver '{
        "sparkSubmit": {
            "entryPoint": "s3://<bucket-name>/jobs/summarization.py",
            "entryPointArguments": [],
            "sparkSubmitParameters": "--conf spark.archives=s3://<bucket-name>/artifacts/packages.tar.gz#environment,s3://<bucket-name>/cacerts/<asset-hash>.zip#cacerts --conf spark.jars=s3://<bucket-name>/artifacts/uber-JAR.jar --files=s3://<bucket-name>/config/models.json --conf spark.emr-serverless.driverEnv.PYSPARK_DRIVER_PYTHON=./environment/bin/python --conf spark.emr-serverless.driverEnv.PYSPARK_PYTHON=./environment/bin/python --conf spark.emr-serverless.executorEnv.PYSPARK_PYTHON=./environment/bin/python --conf spark.emr-serverless.driver.disk=30g --conf spark.emr-serverless.executor.disk=30g --conf spark.executor.instances=10 --conf spark.mongodb.input.uri=mongodb://<username>:<password>@production.••••••.eu-west-1.docdb.amazonaws.com:27017/stock-press?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&directConnection=true&retryWrites=false --conf spark.mongodb.output.uri=mongodb://<username>:<password>@production.••••••.eu-west-1.docdb.amazonaws.com:27017/stock-press?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&directConnection=true&retryWrites=false --conf spark.driver.extraJavaOptions=-Djavax.net.ssl.trustStore=./cacerts/cacerts.jks --conf spark.executor.extraJavaOptions=-Djavax.net.ssl.trustStore=./cacerts/cacerts.jks --conf spark.kryoserializer.buffer.max=2000M"
        }
    }' \
    --configuration-overrides '{
        "monitoringConfiguration": {
            "s3MonitoringConfiguration": {
                "logUri": "s3://<bucket-name>/logs/"
            }
        }
    }'
```

## 3. Workflow Manager

- [What It Does](#31-what-it-does)
- [Airflow with Fargate Architecture](#32-airflow-with-fargate-architecture)
- [Directory Structure](#33-directory-structure)
- [Deployment](#34-deployment)
- [Run Workflow in Production Environment](#35-run-workflow-in-production-environment)

### 3.1. What It Does

This is an [Apache Airflow](https://airflow.apache.org/) application for automating and orchestrating data pipelines that comprise interdependent stages. The application is designed to run on an [Amazon Elastic Container Service](https://aws.amazon.com/ecs/) cluster using the [AWS Fargate](https://aws.amazon.com/fargate/) serverless compute engine.

### 3.2. Airflow with Fargate Architecture

The infrastructure components of an Airflow application fall into two categories: those needed for Airflow itself to operate, and those used to run tasks. The following components belong to the first category.

- The **Webserver** for hosting the [Airflow UI](https://airflow.apache.org/docs/apache-airflow/stable/ui.html), which allows users to trigger and monitor workflows.
- The **Scheduler** for triggering the task instances whose dependencies have been met.
- The **Metadata Database** for storing configuration data and information about past and present workflow runs.
- The **Executor** that provides the mechanism by which task instances get run.

The Webserver and Scheduler are run in Docker containers deployed to [Amazon Elastic Container Service](https://aws.amazon.com/ecs/) that are started by [AWS Fargate](https://aws.amazon.com/fargate/). The Metadata Database is an [Amazon RDS](https://aws.amazon.com/rds/) PostgreSQL instance. The [Celery Executor](https://airflow.apache.org/docs/apache-airflow/stable/executor/celery.html), with [Amazon SQS](https://aws.amazon.com/sqs/) as the [queue broker](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/sqs.html), is used to run task instances.

A [DAG](https://airflow.apache.org/docs/apache-airflow/stable/concepts/dags.html) – or a Directed Acyclic Graph – is a collection of tasks organized in a way that reflects their relationships and dependencies. Each DAG is defined in a Python script that represents the DAG's structure (tasks and their dependencies) as code. Workers are the resources that run the DAG code. An [Airflow Task](https://airflow.apache.org/docs/apache-airflow/stable/concepts/tasks.html) is created by instantiating an [Operator](https://airflow.apache.org/docs/apache-airflow/stable/concepts/operators.html) class. An operator is used to execute the operation that the task needs to perform. A dedicated Fargate task acts as the worker that monitors the queue for messages and either executes tasks directly or uses the [Amazon ECS operator](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/operators/ecs.html) to execute tasks using additional capacity provisioned by either AWS Fargate or [Amazon EC2](https://aws.amazon.com/ec2/).

### 3.3. Directory Structure

```
📦workflow-manager
 ┣ 📂airflow
 ┃ ┣ 📂config
 ┃ ┃ ┣ 📜scheduler_entry.sh
 ┃ ┃ ┣ 📜webserver_entry.sh
 ┃ ┃ ┗ 📜worker_entry.sh
 ┃ ┣ 📂dags
 ┃ ┃ ┣ 📜ecs_dag.py
 ┃ ┃ ┗ 📜emr_dag.py
 ┃ ┗ 📜Dockerfile
 ┗ 📂tasks
 ┃ ┗ 📂ecs_task
 ┃ ┃ ┣ 📜Dockerfile
 ┃ ┃ ┗ 📜app.py
```

### 3.4. Deployment

To deploy the Airflow application to Amazon ECS using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy FarFlowStack`. See the [AWS CDK app](#5-aws-cdk-app) section for details of how to set up the AWS CDK Toolkit. The AWS CDK app outputs the address of the Network Load Balancer that exposes the Airflow Webserver.

### 3.5. Run Workflow in Production Environment

To trigger a DAG manually, navigate to the web address outputted by the AWS CDK app and log in to the Airflow UI as "admin" using the password stored in [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) under the name "airflow/admin". Select the **Trigger DAG** option from the dropdown activated by clicking the play button in the **Actions** column for the DAG you want to run.

## 5. AWS CDK App

- [What It Does](#51-what-it-does)
- [Local Setup](#52-local-setup)
  - [Prerequisites](#521-prerequisites)
  - [Set Up Environment](#522-set-up-environment)
- [Directory Structure](#53-directory-structure)
- [Testing](#54-testing)
- [Deployment](#55-deployment)

### 5.1. What It Does

The [AWS Cloud Development Kit (CDK)](https://docs.aws.amazon.com/cdk/v2/guide/home.html) is a framework for defining cloud infrastructure in code and provisioning it through [AWS CloudFormation](https://aws.amazon.com/cloudformation/). This is an AWS CDK application that defines the cloud infrastructure required by the services contained in this repository.

### 5.2. Local Setup

#### 5.2.1. Prerequisites

- [Node.js JavaScript runtime environment](https://nodejs.org/en/download/)

#### 5.2.2. Set Up Environment

To install the [CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) (a CLI tool for interacting with a CDK app) using the [Node Package Manager](https://www.npmjs.com/), run the command `npm install -g aws-cdk`. The CDK Toolkit needs access to AWS credentials. Access to your credentials can be configured using the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) by running `aws configure` and following the prompts.

Install the Node dependencies by running `npm install` from the `cdk` directory.

### 5.3 Directory Structure

```
📦cdk
 ┣ 📂bin
 ┃ ┗ 📜cdk.ts
 ┣ 📂cdk.out
 ┣ 📂lib
 ┃ ┣ 📂custom-resources
 ┃ ┃ ┣ 📂s3-copy-object
 ┃ ┃ ┃ ┣ 📜handler.py
 ┃ ┃ ┃ ┗ 📜s3-copy-object.ts
 ┃ ┃ ┣ 📂postgres-create-database
 ┃ ┃ ┃ ┣ 📜handler.py
 ┃ ┃ ┃ ┗ 📜postgres-create-database.ts
 ┃ ┣ 📂farflow-stack
 ┃ ┃ ┣ 📂constructs
 ┃ ┃ ┃ ┣ 📜airflow-construct.ts
 ┃ ┃ ┃ ┣ 📜dag-tasks.ts
 ┃ ┃ ┃ ┣ 📜rds.ts
 ┃ ┃ ┃ ┣ 📜service-construct.ts
 ┃ ┃ ┃ ┗ 📜task-construct.ts
 ┃ ┃ ┣ 📜config.ts
 ┃ ┃ ┣ 📜farflow-stack.ts
 ┃ ┃ ┗ 📜policies.ts
 ┃ ┣ 📜config.ts
 ┃ ┣ 📜farflow-stack.ts
 ┃ ┣ 📜policies.ts
 ┃ ┣ 📜crawler-stack.ts
 ┃ ┣ 📜docdb-stack.ts
 ┃ ┣ 📜emr-serverless-stack.ts
 ┃ ┗ 📜vpc-stack.ts
 ┣ 📂test
 ┃ ┣ 📜crawler.test.ts
 ┃ ┣ 📜docdb.test.ts
 ┃ ┣ 📜emr-serverless.test.ts
 ┃ ┗ 📜vpc.test.ts
 ┣ 📜.env
 ┣ 📜.env.example
 ┣ 📜.eslintrc.json
 ┣ 📜.gitignore
 ┣ 📜.npmignore
 ┣ 📜.prettierrc
 ┣ 📜cdk.context.json
 ┣ 📜cdk.json
 ┣ 📜jest.config.js
 ┣ 📜package-lock.json
 ┣ 📜package.json
 ┗ 📜tsconfig.json
```

### 5.4. Testing

This project uses the [Jest](https://jestjs.io/) software testing framework. Run `npm run test` to execute all tests.

### 5.5. Deployment

To deploy all the stacks defined by the application, change the current working directory to `cdk` and run `cdk deploy --all`.
