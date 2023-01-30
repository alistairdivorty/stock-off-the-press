## AWS CDK App

-   [What It Does](#1-what-it-does)
-   [Local Setup](#2-local-setup)
    -   [Prerequisites](#21-prerequisites)
    -   [Set Up Environment](#22-set-up-environment)
-   [Directory Structure](#3-directory-structure)
-   [Testing](#4-testing)
-   [Deployment](#5-deployment)

### 1. What It Does

The [AWS Cloud Development Kit (CDK)](https://docs.aws.amazon.com/cdk/v2/guide/home.html) is a framework for defining cloud infrastructure in code and provisioning it through [AWS CloudFormation](https://aws.amazon.com/cloudformation/). This is an AWS CDK application that defines the cloud infrastructure required by the services contained in this repository.

### 2. Local Setup

#### 2.1. Prerequisites

-   [Node.js JavaScript runtime environment](https://nodejs.org/en/download/)

#### 2.2. Set Up Environment

To install the [CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html) (a CLI tool for interacting with a CDK app) using the [Node Package Manager](https://www.npmjs.com/), run the command `npm install -g aws-cdk`. The CDK Toolkit needs access to AWS credentials. Access to your credentials can be configured using the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) by running `aws configure` and following the prompts.

Install the Node dependencies by running `npm install` from the `cdk` directory.

### 3. Directory Structure

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

### 4. Testing

This project uses the [Jest](https://jestjs.io/) software testing framework. Run `npm run test` to execute all tests.

### 5. Deployment

To deploy all the stacks defined by the application, change the current working directory to `cdk` and run `cdk deploy --all`.
