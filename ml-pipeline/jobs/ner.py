import json
from argparse import ArgumentParser
from pyspark.ml import PipelineModel
from pyspark.sql.functions import (
    udf,
    col,
    lit,
    transform,
    concat,
    array_distinct,
    explode_outer,
    filter,
    max,
    when,
    lower,
)
from pyspark.sql.window import Window
from pyspark.sql import SparkSession
from pyspark.sql import DataFrame
from pyspark.sql.types import StructType, StructField, StringType, IntegerType
from inference.services.spark import start_spark
from inference.transformers.named_entity_recognizer import NamedEntityRecognizer
from thefuzz import fuzz

parser = ArgumentParser()
parser.add_argument("--similarity-threshold", type=int, default=50)


def main():
    args = parser.parse_args()

    spark, logger, config = start_spark()

    df = _extract(spark)

    df = _transform(
        df,
        args.similarity_threshold,
        config.get("models", {}).get("emrfsModelPath", None),
    )

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
                    StructField("description", StringType(), False),
                    StructField("summary", StringType(), False),
                    StructField("topic", StringType(), False),
                    StructField("topic_url_path", StringType(), False),
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
                            "summary": {"$exists": True},
                            "corp": {"$exists": False},
                            "topic_url_path": {"$regex": "^/stream"},
                        }
                    },
                    {
                        "$project": {
                            "headline": 1,
                            "description": 1,
                            "summary": 1,
                            "topic": 1,
                            "topic_url_path": 1,
                        }
                    },
                ]
            ),
        )
        .load()
    )


def _transform(
    df: DataFrame, similarityThreshold: int, emrfsModelPath: str | None = None
) -> DataFrame:
    string_similarity = udf(lambda a, b: fuzz.partial_ratio(a, b), IntegerType())

    col_names = ["headline", "description", "summary"]

    return (
        PipelineModel(
            stages=[
                NamedEntityRecognizer(
                    inputCol=col_name,
                    outputCol=f"{col_name}_entities",
                    cleanAnnotations=True,
                    emrfsModelPath=emrfsModelPath,
                )
                for col_name in col_names
            ]
        )
        .transform(df)
        .select(
            "_id",
            "headline",
            "description",
            "summary",
            "topic",
            *[
                filter(
                    col(f"{col_name}_entities"),
                    lambda entity: entity["entity_group"] == "ORG",
                ).alias(f"{col_name}_entities")
                for col_name in col_names
            ],
        )
        .select(
            "*",
            *[
                transform(
                    col(f"{col_name}_entities"), lambda entity: entity["word"]
                ).alias(f"{col_name}_orgs")
                for col_name in col_names
            ],
        )
        .select(
            "*",
            array_distinct(
                concat(*[f"{col_name}_orgs" for col_name in col_names])
            ).alias("orgs"),
        )
        .withColumn("org", explode_outer(col("orgs")))
        .withColumn(
            "similarity_ratio",
            when(
                col("org").isNotNull(), string_similarity(col("topic"), col("org"))
            ).otherwise(lit(0)),
        )
        .withColumn(
            "max_similarity_ratio",
            max(col("similarity_ratio")).over(Window.partitionBy("_id")),
        )
        .filter(col("similarity_ratio") == col("max_similarity_ratio"))
        .withColumn(
            "corp",
            when(
                col("max_similarity_ratio") > similarityThreshold,
                col("topic"),
            )
            .when(
                lower(col("topic")).rlike(corp_suffixes_regex()),
                col("topic"),
            )
            .otherwise(lit("")),
        )
        .dropDuplicates(["_id"])
        .select(
            "_id",
            "headline",
            "description",
            "summary",
            "topic",
            "corp",
        )
    )


def _load(df: DataFrame):
    (
        df.write.format("mongo")
        .mode("append")
        .option("collection", "articles")
        .option("replaceDocument", "false")
        .save()
    )


def corp_suffixes_regex() -> str:
    return r"\s(group)|(ltd)|(plc)|(co)|(inc)|(corp)|(llc)|(nv)|(spa)|(se)|(sa)|(ag)|(gmbh)|(oao)|(asa)$"


if __name__ == "__main__":
    main()
