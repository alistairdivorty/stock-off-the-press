## Web App Frontend

-   [What It Does](#1-what-it-does)
-   [Local Setup](#2-local-setup)
    -   [Prerequisites](#21-prerequisites)
    -   [Set Up Environment](#22-set-up-environment)
-   [Directory Structure](#3-directory-structure)
-   [Deployment](#4-deployment)

### 1. What It Does

This is a web application frontend for allowing users to view model inferences architected using the [Next.js](https://nextjs.org/) framework.

### 2. Local Setup

#### 2.1. Prerequisites

-   [Node.js JavaScript runtime environment](https://nodejs.org/en/download/)

#### 2.2. Set Up Environment

Install the Node dependencies by running `npm install` from the `web-frontend` directory.

Run `npm run dev` to start the local Next.js development server. By default the server is started on port 3000. Navigate to `http://localhost:3000` to view the site in a web browser.

### 3. Directory Structure

```
📦web-frontend
 ┣ 📂components
 ┃ ┣📜Article.tsx
 ┃ ┗📜...
 ┣ 📂context
 ┃ ┗📜articlesContext.tsx
 ┣ 📂hooks
 ┃ ┣📜useArticlesContext.tsx
 ┃ ┗📜useIntersectionObserver.tsx
 ┣ 📂pages
 ┃ ┣ 📂api
 ┃ ┃ ┗ 📜hello.ts
 ┃ ┣ 📜_app.tsx
 ┃ ┣ 📜_document.tsx
 ┃ ┗ 📜index.tsx
 ┣ 📂public
 ┃ ┣ 📜favicon.ico
 ┃ ┗ 📜robots.txt
 ┣ 📂styles
 ┃ ┗ 📜globals.css
 ┣ 📂types
 ┃ ┗ 📜index.ts
 ┣ 📜.eslintrc.json
 ┣ 📜.gitignore
 ┣ 📜.prettierrc.json
 ┣ 📜next-env.d.ts
 ┣ 📜next.config.js
 ┣ 📜package-lock.json
 ┣ 📜package.json
 ┣ 📜postcss.config.js
 ┣ 📜tailwind.config.js
 ┗ 📜tsconfig.json
```

### 4. Deployment

To deploy the application using the [AWS CDK Toolkit](https://docs.aws.amazon.com/cdk/v2/guide/cli.html), change the current working directory to `cdk` and run `cdk deploy WebAppStack`. See the [AWS CDK app](../README.md#6-aws-cdk-app) section of the main README for details of how to set up the AWS CDK Toolkit. The CDK app takes care of bundling the project files using the [standalone output](https://nextjs.org/docs/advanced-features/output-file-tracing) build mode for deployment to [AWS Lambda](https://aws.amazon.com/lambda/).
