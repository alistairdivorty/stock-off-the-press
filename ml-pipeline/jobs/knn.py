import json, os
from datetime import datetime, date, time
from argparse import ArgumentParser, BooleanOptionalAction
from pyspark.ml import Pipeline, PipelineModel
from pyspark.ml.feature import RegexTokenizer, NGram, HashingTF, IDF
from pyspark.sql.functions import col
from pyspark.sql import SparkSession
from pyspark.sql import DataFrame
from pyspark.sql.types import StructType, StructField, StringType
from pyspark_hnsw.knn import HnswSimilarity
from inference.services.spark import start_spark

arg_parser = ArgumentParser()
arg_parser.add_argument("--similarity-threshold", type=float, default=0.4)
arg_parser.add_argument("--num-partitions", type=int, default=2)
arg_parser.add_argument(
    "--save-model", type=bool, action=BooleanOptionalAction, default=False
)
arg_parser.add_argument("--from", dest="from_", type=date.fromisoformat)
arg_parser.add_argument("--to", type=date.fromisoformat)


def main():
    args = arg_parser.parse_args()

    spark, logger, config = start_spark()

    symbols, articles = _extract(spark)

    emrfs_model_path = config.get("models", {}).get("emrfsModelPath", None)

    df, model = _transform(
        symbols,
        articles,
        args.similarity_threshold,
        args.num_partitions,
        args.save_model,
        emrfs_model_path,
    )

    _load(df, model if args.save_model else None, emrfs_model_path)

    spark.stop()


def _extract(spark: SparkSession) -> tuple[DataFrame, DataFrame]:
    args = arg_parser.parse_args()

    symbols = (
        spark.read.schema(
            StructType(
                [
                    StructField(
                        "_id",
                        StructType([StructField("oid", StringType(), False)]),
                        False,
                    ),
                    StructField("name", StringType(), False),
                    StructField("code", StringType(), False),
                    StructField("exchange", StringType(), False),
                ]
            )
        )
        .format("mongo")
        .option("collection", "symbols")
        .option(
            "pipeline",
            json.dumps(
                [
                    {
                        "$project": {
                            "name": 1,
                            "code": 1,
                            "exchange": 1,
                        }
                    },
                ]
            ),
        )
        .load()
    )

    articles = (
        spark.read.schema(
            StructType(
                [
                    StructField(
                        "_id",
                        StructType([StructField("oid", StringType(), False)]),
                        False,
                    ),
                    StructField("corp", StringType(), False),
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
                            "corp": {
                                "$exists": True,
                                "$ne": "",
                            },
                            "symbol": {"$exists": False},
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
                        }
                    },
                    {
                        "$project": {
                            "corp": 1,
                        }
                    },
                ]
            ),
        )
        .load()
    )

    return symbols, articles


def _transform(
    symbols: DataFrame,
    articles: DataFrame,
    similarityThreshold: int,
    numPartitions: int,
    saveModel: bool,
    emrfsModelPath: str | None = None,
) -> tuple[DataFrame, PipelineModel]:
    model = (
        PipelineModel.load(os.path.join(emrfsModelPath or "assets/models", "hnswlib"))
        if not saveModel
        else Pipeline(
            stages=[
                RegexTokenizer(
                    inputCol="name",
                    outputCol="tokens",
                    pattern="",
                ),
                NGram(
                    n=3,
                    inputCol="tokens",
                    outputCol="ngrams",
                ),
                HashingTF(
                    inputCol="ngrams",
                    outputCol="raw_features",
                ),
                IDF(
                    inputCol="raw_features",
                    outputCol="features",
                ),
                HnswSimilarity(
                    identifierCol="oid",
                    queryIdentifierCol="oid",
                    featuresCol="features",
                    distanceFunction="cosine",
                    k=1,
                    m=48,
                    ef=2000,
                    efConstruction=2000,
                    numPartitions=numPartitions,
                    numReplicas=2,
                    excludeSelf=False,
                    similarityThreshold=similarityThreshold,
                    predictionCol="knn",
                ),
            ]
        ).fit(
            symbols.select(
                "*",
                col("_id").oid.alias("oid"),
            )
        )
    )

    df = (
        model.transform(
            articles.select(
                "*",
                col("_id").oid.alias("oid"),
                col("corp").alias("name"),
            )
        )
        .drop("tokens", "ngrams", "raw_features", "features")
        .join(
            symbols.withColumnRenamed("_id", "symbol_id"),
            col("symbol_id").oid == col("knn")[0].neighbor,
            "leftouter",
        )
        .select("_id", "corp", col("code").alias("symbol"), "exchange")
    )

    return df, model


def _load(
    df: DataFrame, model: PipelineModel | None, emrfsModelPath: str | None = None
):
    if model is not None:
        model.write().overwrite().save(
            os.path.join(emrfsModelPath or "assets/models", "hnswlib")
        )

    (
        df.write.format("mongo")
        .mode("append")
        .option("collection", "articles")
        .option("replaceDocument", "false")
        .save()
    )


if __name__ == "__main__":
    main()
