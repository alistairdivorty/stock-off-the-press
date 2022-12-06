import json
from pyspark.ml import PipelineModel
from pyspark.sql import SparkSession
from pyspark.sql import DataFrame
from pyspark.sql.types import StructType, StructField, StringType
from inference.services.spark import start_spark
from inference.transformers.summarizer import Summarizer
import os


def main():
    spark, logger, config = start_spark()

    df = _extract(spark)

    df = _transform(df, config.get("models", {}).get("emrfsModelPath", None))

    _load(df)

    spark.stop()


def _extract(spark: SparkSession) -> DataFrame:
    return (
        spark.read.schema(
            StructType(
                [
                    StructField(
                        "_id",
                        StructType([StructField("oid", StringType(), False)]),
                        False,
                    ),
                    StructField("headline", StringType(), False),
                    StructField("text", StringType(), False),
                ]
            )
        )
        .format("mongo")
        .option("collection", "articles")
        .option(
            "pipeline",
            json.dumps(
                [
                    {"$match": {"summary": {"$exists": False}}},
                    {
                        "$project": {
                            "headline": 1,
                            "text": 1,
                        }
                    },
                    {"$limit": 1},
                ]
            ),
        )
        .load()
    )


def _transform(df: DataFrame, emrsModelPath: str | None) -> DataFrame:
    return PipelineModel(
        stages=[
            Summarizer(
                inputCol="text",
                outputCol="summary",
                minLength=100,
                maxLength=200,
                lengthPenalty=2.0,
                numBeams=4,
                emrfsModelPath=emrsModelPath,
            )
        ]
    ).transform(df)


def _load(df: DataFrame):
    (
        df.write.format("mongo")
        .mode("append")
        .option("collection", "articles")
        .option("replaceDocument", "false")
        .save()
    )


if __name__ == "__main__":
    main()
