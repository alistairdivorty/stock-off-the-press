FROM alpine:latest as download_sparknlp_models

RUN apk update && apk add unzip

RUN mkdir models

RUN wget \
    https://s3.amazonaws.com/auxdata.johnsnowlabs.com/public/models/sentence_detector_dl_xx_2.7.0_2.4_1609610616998.zip

RUN unzip \
    sentence_detector_dl_xx_2.7.0_2.4_1609610616998.zip \
    -d models/sentence_detector_dl_xx

RUN wget \
    https://s3.amazonaws.com/auxdata.johnsnowlabs.com/public/models/bert_large_token_classifier_conll03_en_3.2.0_2.4_1628171471927.zip

RUN unzip \
    bert_large_token_classifier_conll03_en_3.2.0_2.4_1628171471927.zip \
    -d models/bert_large_token_classifier_conll03_en

RUN wget \
    https://s3.amazonaws.com/auxdata.johnsnowlabs.com/public/models/sent_bert_large_cased_en_2.6.0_2.4_1598346401930.zip

RUN unzip \
    sent_bert_large_cased_en_2.6.0_2.4_1598346401930 \
    -d models/sent_bert_large_cased_en

FROM python:3.10 as download_transformers_models

RUN pip install transformers[torch]

COPY scripts/download_models.py .

RUN python download_models.py

FROM download_transformers_models as package_transformers_models

RUN pip install mlflow

COPY inference inference

COPY pyproject.toml .

RUN pip install .

COPY scripts/package_models.py .

RUN mkdir models

RUN python package_models.py

FROM scratch as export

COPY --from=download_sparknlp_models models assets/models

COPY --from=package_transformers_models models assets/models