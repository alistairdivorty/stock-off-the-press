import os, json, argparse
from datetime import datetime, date, time
from pyspark.ml import PipelineModel
from pyspark.sql import SparkSession
from pyspark.sql import DataFrame
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    DateType,
)
from pyspark.sql.functions import col, lit, concat
from inference.services.spark import start_spark
from inference.transformers.vectorizer import Vectorizer

arg_parser = argparse.ArgumentParser()
arg_parser.add_argument("--from", dest="from_", type=date.fromisoformat)
arg_parser.add_argument("--to", type=date.fromisoformat)


def main():
    spark, logger, config = start_spark()

    df = _extract(spark)

    model = _transform(df, config.get("models", {}).get("emrfsModelPath", None))

    _load(model)

    spark.stop()


def _extract(spark: SparkSession) -> DataFrame:
    args = arg_parser.parse_args()

    return (
        spark.read.schema(
            StructType(
                [
                    StructField(
                        "_id",
                        StructType([StructField("oid", StringType(), False)]),
                        False,
                    ),
                    StructField("date_published", DateType(), False),
                    StructField("headline", StringType(), False),
                    StructField("description", StringType(), False),
                    StructField("summary", StringType(), False),
                ]
            )
        )
        .format("mongo")
        .option("collection", "articles")
        .option(
            "pipeline",
            json.dumps(
                [
                    {
                        "$match": {
                            "date_published": {
                                "$gt": {
                                    "$date": datetime.combine(
                                        args.from_, time.min
                                    ).isoformat()
                                    + "Z"
                                },
                                "$lt": {
                                    "$date": datetime.combine(
                                        args.to, time.min
                                    ).isoformat()
                                    + "Z"
                                },
                            },
                            "symbol": {"$exists": True},
                            "prediction": {"$exists": False}
                        },
                    },
                    {
                        "$project": {
                            "date_published": 1,
                            "headline": 1,
                            "description": 1,
                            "summary": 1,
                        }
                    },
                ]
            ),
        )
        .load()
    )


def _transform(df: DataFrame, emrfsModelPath: str | None = None) -> DataFrame:
    return (
        PipelineModel(
            stages=[
                Vectorizer(
                    inputCol="text",
                    outputCol="embeddings",
                    emrfsModelPath=emrfsModelPath,
                ),
                PipelineModel.load(
                    os.path.join(emrfsModelPath or "assets/models", "gbt")
                ),
            ]
        )
        .transform(
            df.withColumn(
                "text",
                concat(
                    col("headline"),
                    lit(". "),
                    col("description"),
                    lit(". "),
                    col("summary"),
                ),
            )
        )
        .select("_id", col("direction").alias("prediction"))
    )


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
