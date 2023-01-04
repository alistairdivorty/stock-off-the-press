import os
from pyspark import keyword_only
from pyspark.ml import Transformer
from pyspark.ml.param.shared import (
    HasInputCol,
    HasOutputCol,
    Param,
    Params,
    TypeConverters,
)
from pyspark.ml.util import DefaultParamsReadable, DefaultParamsWritable
from pyspark.sql import DataFrame
from pyspark.ml import Pipeline
from sparknlp.base import DocumentAssembler
from sparknlp.annotator import BertSentenceEmbeddings
from sparknlp.base import EmbeddingsFinisher


class Vectorizer(
    Transformer,
    HasInputCol,
    HasOutputCol,
    DefaultParamsReadable,
    DefaultParamsWritable,
):
    cleanAnnotations = Param(
        Params._dummy(),
        "cleanAnnotations",
        "Whether to remove annotation columns.",
        typeConverter=TypeConverters.toBoolean,
    )

    emrfsModelPath = Param(
        Params._dummy(),
        "emrfsModelPath",
        "The location, in URI format, of the Spark NLP model parent folder.",
        typeConverter=TypeConverters.toString,
    )

    @keyword_only
    def __init__(
        self, inputCol=None, outputCol=None, cleanAnnotations=None, emrfsModelPath=None
    ):
        super().__init__()
        self._setDefault(
            inputCol="input",
            outputCol="output",
            cleanAnnotations=True,
            emrfsModelPath=None,
        )
        kwargs = self._input_kwargs
        self.setParams(**kwargs)

    @keyword_only
    def setParams(
        self, inputCol=None, outputCol=None, cleanAnnotations=None, emrfsModelPath=None
    ):
        kwargs = self._input_kwargs
        return self._set(**kwargs)

    def setInputCol(self, inputCol):
        return self.setParams(inputCol=inputCol)

    def setOutputCol(self, outputCol):
        return self.setParams(outputCol=outputCol)

    def setCleanAnnotations(self, cleanAnnotations):
        return self.setParams(cleanAnnotations=cleanAnnotations)

    def setEmrfsModelPath(self, emrfsModelPath):
        return self.setParams(emrfsModelPath=emrfsModelPath)

    def getInputCol(self):
        return self.getOrDefault(self.inputCol)

    def getOutputCol(self):
        return self.getOrDefault(self.outputCol)

    def getCleanAnnotations(self):
        return self.getOrDefault(self.cleanAnnotations)

    def getModelUri(self, model_name):
        emrfs_model_path = self.getOrDefault(self.emrfsModelPath)
        if not emrfs_model_path:
            return os.path.join("assets/models", model_name)
        return os.path.join(emrfs_model_path, model_name)

    def _transform(self, df: DataFrame) -> DataFrame:
        document_assembler = (
            DocumentAssembler().setInputCol(self.getInputCol()).setOutputCol("document")
        )

        sent_bert = (
            BertSentenceEmbeddings.load(self.getModelUri("sent_bert_large_cased_en"))
            .setInputCols("document")
            .setOutputCol("sentence_embeddings")
        )

        embeddings_finisher = (
            EmbeddingsFinisher()
            .setInputCols("sentence_embeddings")
            .setOutputCols("embeddings")
            .setOutputAsVector(True)
        )

        df = (
            Pipeline(
                stages=[
                    document_assembler,
                    sent_bert,
                    embeddings_finisher,
                ]
            )
            .fit(df)
            .transform(df)
        )

        return (
            df.drop(
                *(
                    c
                    for c in ["document", "sentence_embeddings"]
                    if c != self.getOutputCol()
                )
            )
            if self.getCleanAnnotations()
            else df
        )
