import json, os
from argparse import ArgumentParser
from pyspark.ml import PipelineModel
from pyspark.sql import SparkSession
from pyspark.sql import DataFrame
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    ArrayType,
    DoubleType,
    IntegerType,
)
from pyspark.sql.functions import col, lit, concat
from inference.services.spark import start_spark
from inference.transformers.vectorizer import Vectorizer

parser = ArgumentParser()
parser.add_argument("--data-dest-path", default="data")


def main():
    args = parser.parse_args()

    spark, logger, config = start_spark()

    df = _extract(spark)

    df = _transform(df)

    _load(df, args.data_dest_path)

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
                    StructField("description", StringType(), False),
                    StructField("summary", StringType(), False),
                    StructField(
                        "prices",
                        ArrayType(
                            StructType(
                                [
                                    StructField("date", StringType(), False),
                                    StructField("open", DoubleType(), False),
                                    StructField("high", DoubleType(), False),
                                    StructField("low", DoubleType(), False),
                                    StructField("close", DoubleType(), False),
                                    StructField("adjusted_close", DoubleType(), False),
                                    StructField("volume", IntegerType(), False),
                                ]
                            ),
                            False,
                        ),
                        False,
                    ),
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
                            "prices": {"$ne": None},
                            "vectorized": {"$exists": False},
                        },
                    },
                    {
                        "$project": {
                            "headline": 1,
                            "description": 1,
                            "summary": 1,
                            "prices": 1,
                        }
                    },
                ]
            ),
        )
        .load()
    )


def _transform(df: DataFrame) -> DataFrame:
    return PipelineModel(
        stages=[Vectorizer(inputCol="text", outputCol="embeddings")]
    ).transform(
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


def _load(df: DataFrame, path_: str):
    df.write.mode("append").parquet(os.path.join(path_, "embeddings"))

    (
        df.drop("embeddings")
        .withColumn("vectorized", lit(True))
        .write.format("mongo")
        .mode("append")
        .option("collection", "articles")
        .option("replaceDocument", "false")
        .save()
    )


if __name__ == "__main__":
    main()
