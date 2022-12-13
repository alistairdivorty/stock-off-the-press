FROM apache/airflow:2.5.0-python3.8

ENV AIRFLOW_HOME=/usr/local/airflow

USER root

RUN apt-get update && apt-get install -y python3-pip \
    libcurl4-gnutls-dev \
    librtmp-dev \
    python3-dev \
    libpq-dev

RUN python3 -m pip install --upgrade pip

RUN python3 -m pip install awscli
RUN export PATH=~/.local/bin:$PATH; \
    aws --version

COPY ./config/* /
COPY ./dags ${AIRFLOW_HOME}/dags

RUN chown -R airflow: ${AIRFLOW_HOME}

EXPOSE 8080

USER airflow

RUN python3 -m pip install --user --no-cache-dir argcomplete pycurl concurrent-log-handler apache-airflow-providers-amazon

WORKDIR ${AIRFLOW_HOME}

# ENTRYPOINT ["/entrypoint.sh"]