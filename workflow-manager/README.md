## Workflow Manager

- [What It Does](#1-what-it-does)
- [Airflow with Fargate Architecture](#2-airflow-with-fargate-architecture)
- [Directory Structure](#3-directory-structure)
- [Deployment](#4-deployment)
- [Run Workflow in Production Environment](#5-run-workflow-in-production-environment)

### 1. What It Does

This is an [Apache Airflow](https://airflow.apache.org/) application for automating and orchestrating data pipelines that comprise interdependent stages. The application is designed to run on an [Amazon Elastic Container Service](https://aws.amazon.com/ecs/) cluster using the [AWS Fargate](https://aws.amazon.com/fargate/) serverless compute engine.

### 2. Airflow with Fargate Architecture

The infrastructure components of an Airflow application fall into two categories: those needed for Airflow itself to operate, and those used to run tasks. The following components belong to the first category.

- The **Webserver** for hosting the [Airflow UI](https://airflow.apache.org/docs/apache-airflow/stable/ui.html), which allows users to trigger and monitor workflows.
- The **Scheduler** for triggering the task instances whose dependencies have been met.
- The **Metadata Database** for storing configuration data and information about past and present workflow runs.
- The **Executor** that provides the mechanism by which task instances get run.

The Webserver and Scheduler are run in Docker containers deployed to [Amazon Elastic Container Service](https://aws.amazon.com/ecs/) that are started by [AWS Fargate](https://aws.amazon.com/fargate/). The Metadata Database is an [Amazon RDS](https://aws.amazon.com/rds/) PostgreSQL instance. The [Celery Executor](https://airflow.apache.org/docs/apache-airflow/stable/executor/celery.html), with [Amazon SQS](https://aws.amazon.com/sqs/) as the [queue broker](https://docs.celeryq.dev/en/stable/getting-started/backends-and-brokers/sqs.html), is used to run task instances.

A [DAG](https://airflow.apache.org/docs/apache-airflow/stable/concepts/dags.html) – or a Directed Acyclic Graph – is a collection of tasks organized in a way that reflects their relationships and dependencies. Each DAG is defined in a Python script that represents the DAG's structure (tasks and their dependencies) as code. Workers are the resources that run the DAG code. An [Airflow Task](https://airflow.apache.org/docs/apache-airflow/stable/concepts/tasks.html) is created by instantiating an [Operator](https://airflow.apache.org/docs/apache-airflow/stable/concepts/operators.html) class. An operator is used to execute the operation that the task needs to perform. A dedicated Fargate task acts as the worker that monitors the queue for messages and either executes tasks directly or uses the [Amazon ECS operator](https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/operators/ecs.html) to execute tasks using additional capacity provisioned by either AWS Fargate or [Amazon EC2](https://aws.amazon.com/ec2/).

### 3. Directory Structure

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

### 4. Deployment

To deploy the Airflow application to Amazon ECS using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy FarFlowStack`. See the [AWS CDK app](../README.md#6-aws-cdk-app) section of the main README for details of how to set up the AWS CDK Toolkit. The AWS CDK app outputs the address of the Network Load Balancer that exposes the Airflow Webserver.

### 5. Run Workflow in Production Environment

To trigger a DAG manually, navigate to the web address outputted by the AWS CDK app and log in to the Airflow UI as "admin" using the password stored in [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) under the name "airflow/admin". Select the **Trigger DAG** option from the dropdown activated by clicking the play button in the **Actions** column for the DAG you want to run.
