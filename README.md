# Stock Off The Press

This monorepo contains an application for crawling sources of market news, a machine learning pipeline for predicting the effect of news stories on stock prices, a workflow manager for application orchestration, a web application for serving model inferences, and an application for provisioning the required cloud infrastructure.

- [Crawler](#1-crawler)
- [Cloud Development Kit](#5-cloud-development-kit)

## 1. Crawler

- [What It Does](#11-what-it-does)
- [Local Setup](#12-local-setup)
  - [Prerequisites](#121-prerequisites)
  - [Set Up Environment](#122-set-up-environment)
- [Directory Structure](#13-directory-structure)
- [Run Crawl in Local Development Environment](#14-run-crawl-in-local-development-environment)
- [Deployment](#15-deployment)
- [Run Crawl in Production Environment](#16-run-crawl-in-production-environment)

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
PYTHONPATH=<i>path/to/project/dir/crawler-project/crawler</i>:$HOME/miniconda3/envs/<i>env-name</i>/lib/python3.10/site-packages</code></pre>

Reactivate the environment by running <code>conda activate _env-name_</code>.

To create a file for storing environment variables, run `cp .env.example .env` from `crawler-project` directory.

### 1.3. Directory Structure

### 1.4. Run Crawl in Local Development Environment

To initiate a crawl from your local machine, change the current working directory to `crawler-project` and run the command <code>scrapy crawl _spider-name_</code>, substituting <code>_spider-name_</code> with the name of the spider you want to run. Alternatively, start the crawler by executing `scripts/crawl.py`.

The optional parameter `year` can be used to specify the year within which an article must have been published for it to be processed by the spider. If no year is specified, the spider defaults to processing only the most recently published articles. If starting the crawler using the `scrapy crawl` command, a value for the `year` parameter can be supplied by passing the key-value pair <code>year=_dddd_</code> to the `—a` option. If starting the crawler using the `crawl.py` script, a value for the parameter can be passed as a command line argument.

## 5. Cloud Development Kit
