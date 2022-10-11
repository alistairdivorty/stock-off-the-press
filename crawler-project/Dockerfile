FROM continuumio/miniconda3

WORKDIR /usr/src/app

COPY scrapy.cfg .
COPY requirements.txt .
COPY crawler crawler

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

RUN pip install -r requirements.txt

COPY entrypoint.sh .

RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]

CMD ["sh", "-c", "python3 ./crawler/scripts/crawl.py"]
