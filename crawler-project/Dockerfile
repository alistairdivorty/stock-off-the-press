FROM continuumio/miniconda3

WORKDIR /usr/src/app

# install build dependencies
RUN apt-get update && \
    apt-get install -y \
    g++ \
    make \
    cmake \
    unzip \
    libcurl4-openssl-dev

# create Conda environment
RUN conda create -n crawler python=3.10

# make RUN commands use the new environment
RUN echo "conda activate crawler" >> ~/.bashrc
SHELL ["/bin/bash", "--login", "-c"]

# install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# download CA certificate for TLS connection to DB
RUN wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem

COPY scrapy.cfg .
COPY crawler crawler

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD ["sh", "-c", "python3 ./crawler/scripts/crawl.py"]
