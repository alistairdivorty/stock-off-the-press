ARG FUNCTION_DIR="/function/"

FROM mcr.microsoft.com/playwright:v1.20.0-focal as build-image

# Include global arg in this stage of the build
ARG FUNCTION_DIR

# Install aws-lambda-ric build dependencies
RUN apt-get update && apt-get install -y \
    g++ \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    autoconf \
    libtool

# Create function directory and set it as WORKDIR
RUN mkdir -p ${FUNCTION_DIR}

# Install Playwright
RUN npm install --prefix ${FUNCTION_DIR} playwright@1.20.0

# Install AWS SDK
RUN npm install --prefix ${FUNCTION_DIR} aws-sdk

# Install AWS Lambda Node Runtime Interface Client
RUN npm install --prefix ${FUNCTION_DIR} aws-lambda-ric

# Get fresh slim copy of base image to reduce final image size
FROM mcr.microsoft.com/playwright:v1.20.0-focal

USER root

# Include global arg in this stage of the build
ARG FUNCTION_DIR

# Set working directory to function root directory
WORKDIR ${FUNCTION_DIR}

# Copy in the built dependencies
COPY --from=build-image ${FUNCTION_DIR} ${FUNCTION_DIR}

# Add Lambda Runtime Interface Emulator
ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/local/bin/aws-lambda-rie
RUN chmod 755 /usr/local/bin/aws-lambda-rie

# Copy in handler function
COPY index.js ${FUNCTION_DIR}

# Add script that starts RIC through emulator for local runs
COPY entrypoint.sh /
RUN chmod 755 /entrypoint.sh
ENTRYPOINT [ "/entrypoint.sh" ]

# Set function handler
CMD ["index.handler"]