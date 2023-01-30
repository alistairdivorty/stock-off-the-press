## Web App Backend

- [What It Does](#1-what-it-does)
- [Local Setup](#2-local-setup)
  - [Prerequisites](#21-prerequisites)
  - [Set Up Environment](#22-set-up-environment)
- [Directory Structure](#3-directory-structure)
- [Deployment](#4-deployment)

### 1. What It Does

This is a web application backend for serving model inferences architected using the [Django](https://www.djangoproject.com/) framework.

### 2. Local Setup

#### 2.1. Prerequisites

- [Conda package and environment manager](https://docs.conda.io/projects/conda/en/latest/)

#### 2.2. Set Up Environment

Start by installing the conda package and environment manager. The [Miniconda](https://docs.conda.io/en/latest/miniconda.html#) installer can be used to install a small, bootstrap version of Anaconda that includes only conda, Python, the packages they depend on, and a small number of other useful packages, including pip.

To create a fresh conda environment, run `conda create -n <env-name> python=3.10`, substituting `<env-name>` with your desired environment name. Once the environment has been created, activate the environment by running `conda activate <env-name>`.

Install the Python dependencies for the backend by running `pip install -r requirements.txt` from the `web-backend` directory.

Set the necessary environment variables by modifying the command below as required depending on the location of your Miniconda installation and environment name.

```shell
conda env config vars set \
PYTHONPATH=<path/to/project/dir>/web-backend:$HOME/opt/miniconda3/envs/<env-name>/lib/python3.10/site-packages
```

Reactivate the environment by running `conda activate <env-name>`.

To create a file for storing environment variables, run `cp .env.example .env` from the `web-backend` directory.

Run `python manage.py runserver` from the `web-backend` directory to start the local Django development server. By default the server is started on port 8000.

### 3. Directory Structure

```
📦web-backend
 ┣ 📂core
 ┃ ┣ 📂templates
 ┃ ┃ ┗ 📜robots.txt
 ┃ ┣ 📜asgi.py
 ┃ ┣ 📜settings.py
 ┃ ┣ 📜urls.py
 ┃ ┣ 📜utils.py
 ┃ ┗ 📜wsgi.py
 ┣ 📂stockpress
 ┃ ┃ ┣ 📂views
 ┃ ┃ ┣ 📜articles.py
 ┃ ┃ ┗ 📜home.py
 ┣ 📜admin.py
 ┣ 📜apps.py
 ┣ 📜models.py
 ┣ 📜tests.py
 ┗ 📜urls.py
 ┣ 📜.env.example
 ┣ 📜.gitignore
 ┣ 📜Dockerfile
 ┣ 📜manage.py
 ┣ 📜requirements.txt
 ┗ 📜zappa_settings.json
```

### 4. Deployment

To deploy the application using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy WebAppStack`. See the [AWS CDK app](../README.md#6-aws-cdk-app) section of the main README for details of how to set up the AWS CDK Toolkit. The CDK app takes care of bundling the project files using the [Zappa](https://github.com/zappa/Zappa) build tool for deployment to [AWS Lambda](https://aws.amazon.com/lambda/).
