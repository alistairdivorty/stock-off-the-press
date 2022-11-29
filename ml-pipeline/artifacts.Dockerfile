FROM --platform=linux/amd64 continuumio/miniconda3 AS conda_build

RUN apt-get update && \
    apt-get install -y cmake build-essential pkg-config

RUN echo ". /opt/conda/etc/profile.d/conda.sh" >> ~/.bashrc
SHELL ["/bin/bash", "-c"]

WORKDIR /build

RUN source ~/.bashrc && \
    conda create -n dist-inf python=3.10

SHELL ["conda", "run", "-n", "dist-inf", "/bin/bash", "-c"]

COPY requirements.txt .
RUN pip install -U pip
RUN pip install -r requirements.txt

COPY inference inference
COPY pyproject.toml .
RUN pip install .

RUN conda install -c conda-forge conda-pack && \
    conda pack -f -n dist-inf -o packages.tar.gz --ignore-missing-files

FROM --platform=linux/amd64 maven:3.6-amazoncorretto-8 AS build

WORKDIR /build

COPY pom.xml .

RUN mvn clean package

FROM scratch AS export

COPY --from=conda_build /build/packages.tar.gz artifacts/packages.tar.gz

COPY --from=build /build/target/uber-JAR.jar artifacts/uber-JAR.jar