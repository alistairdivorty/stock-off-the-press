import os
import mlflow
from pyspark.sql import SparkSession
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
from pyspark.sql.functions import col, lit, struct
from pyspark.sql import DataFrame


class Summarizer(
    Transformer,
    HasInputCol,
    HasOutputCol,
    DefaultParamsReadable,
    DefaultParamsWritable,
):
    minLength = Param(
        Params._dummy(),
        "minLength",
        "The min length of the sequence to be generated. Default to 0.",
        typeConverter=TypeConverters.toInt,
    )

    maxLength = Param(
        Params._dummy(),
        "maxLength",
        "The max length of the sequence to be generated. Default to 20.",
        typeConverter=TypeConverters.toInt,
    )

    lengthPenalty = Param(
        Params._dummy(),
        "lengthPenalty",
        "Exponential penalty to the length. Default to 1.",
        typeConverter=TypeConverters.toFloat,
    )

    numBeams = Param(
        Params._dummy(),
        "numBeams",
        "Number of beams for beam search. Must be between 1 and infinity. 1 means no beam search. Default to 1.",
        typeConverter=TypeConverters.toInt,
    )

    emrfsModelPath = Param(
        Params._dummy(),
        "emrfsModelPath",
        "The location, in URI format, of the MLflow model parent folder.",
        typeConverter=TypeConverters.toString,
    )

    @keyword_only
    def __init__(
        self,
        inputCol=None,
        outputCol=None,
        minLength=None,
        maxLength=None,
        lengthPenalty=None,
        numBeams=None,
        emrfsModelPath=None,
    ):
        super().__init__()
        self._setDefault(
            inputCol="input",
            outputCol="output",
            minLength=0,
            maxLength=20,
            lengthPenalty=1.0,
            numBeams=1,
            emrfsModelPath=None,
        )
        kwargs = self._input_kwargs
        self.setParams(**kwargs)

    @keyword_only
    def setParams(
        self,
        inputCol=None,
        outputCol=None,
        minLength=None,
        maxLength=None,
        lengthPenalty=None,
        numBeams=None,
        emrfsModelPath=None,
    ):
        kwargs = self._input_kwargs
        return self._set(**kwargs)

    def setInputCol(self, inputCol):
        return self.setParams(inputCol=inputCol)

    def setOutputCol(self, outputCol):
        return self.setParams(outputCol=outputCol)

    def setMinLength(self, minLength):
        return self.setParams(minLength=minLength)

    def setMaxLength(self, maxLength):
        return self.setParams(maxLength=maxLength)

    def setLengthPenalty(self, lengthPenalty):
        return self.setParams(lengthPenalty=lengthPenalty)

    def setNumBeams(self, numBeams):
        return self.setParams(numBeams=numBeams)

    def setEmrfsModelPath(self, emrfsModelPath):
        return self.setParams(emrfsModelPath=emrfsModelPath)

    def getInputCol(self):
        return self.getOrDefault(self.inputCol)

    def getMinLength(self):
        return self.getOrDefault(self.minLength)

    def getMaxLength(self):
        return self.getOrDefault(self.maxLength)

    def getLengthPenalty(self):
        return self.getOrDefault(self.lengthPenalty)

    def getNumBeams(self):
        return self.getOrDefault(self.numBeams)

    def getModelUri(self):
        model_name = "facebook_bart_large_cnn"
        emrfs_model_path = self.getOrDefault(self.emrfsModelPath)
        if not emrfs_model_path:
            return os.path.join("assets/models", model_name)
        return os.path.join(emrfs_model_path, model_name)

    def _transform(self, df: DataFrame) -> DataFrame:
        spark = SparkSession.getActiveSession()

        predict = mlflow.pyfunc.spark_udf(
            spark,
            model_uri=self.getModelUri(),
            result_type="string",
            env_manager="local",
        )

        return df.withColumn(
            self.getOutputCol(),
            predict(
                struct(
                    col(self.getInputCol()).alias("input"),
                    lit(self.getMinLength()).alias("min_length"),
                    lit(self.getMaxLength()).alias("max_length"),
                    lit(self.getLengthPenalty()).alias("length_penalty"),
                    lit(self.getNumBeams()).alias("num_beams"),
                )
            ),
        )
