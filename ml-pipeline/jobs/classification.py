import os, json
from pyspark.ml import Pipeline, PipelineModel
from pyspark.ml.classification import GBTClassifier
from pyspark.ml.feature import SQLTransformer, StringIndexer, IndexToString
from pyspark.ml.evaluation import MulticlassClassificationEvaluator
from pyspark.sql import SparkSession
from pyspark.sql import DataFrame
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    DoubleType,
    IntegerType,
    ArrayType,
    DateType,
)
from pyspark.sql.functions import (
    col,
    lit,
    concat,
    when,
    explode,
    datediff,
    date_add,
    abs,
    min,
    max,
)
from pyspark.sql.window import Window
from inference.services.spark import start_spark
from inference.transformers.vectorizer import Vectorizer


def main():
    spark, logger, config = start_spark()

    df = _extract(spark)

    model = _transform(df)

    _load(model, config.get("models", {}).get("emrfsModelPath", None))

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
                    StructField("date_published", DateType(), False),
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
                        },
                    },
                    {
                        "$project": {
                            "date_published": 1,
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


def _transform(df: DataFrame) -> PipelineModel:
    data = PipelineModel(
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
        .withColumn("future_price", explode(col("prices")))
        .withColumn(
            "datediff",
            abs(
                datediff(
                    col("future_price").date.cast("date"),
                    date_add(col("date_published"), 7),
                )
            ),
        )
        .withColumn(
            "min_datediff",
            min(col("datediff")).over(Window.partitionBy("_id")),
        )
        .filter(col("datediff") == col("min_datediff"))
        .withColumn(
            "latest",
            max(
                col("future_price").date.cast("date"),
            ).over(Window.partitionBy("_id")),
        )
        .drop("datediff", "min_datediff", "latest")
        .withColumn("current_price", col("prices")[0])
        .drop("prices")
        .withColumn(
            "label",
            when(
                col("future_price").adjusted_close > col("current_price").open,
                lit("rise"),
            ).otherwise(lit("fall")),
        )
    )

    explode_vectors = SQLTransformer(
        statement="SELECT EXPLODE(embeddings) AS features, * FROM __THIS__"
    )

    label_indexer = StringIndexer(inputCol="label", outputCol="indexed_label").fit(data)

    training_data, test_data = data.randomSplit([0.7, 0.3])

    gbt = GBTClassifier(labelCol="indexed_label", featuresCol="features", maxIter=10)

    label_converter = IndexToString(
        inputCol="prediction", outputCol="direction", labels=label_indexer.labels
    )

    pipeline = Pipeline(
        stages=[
            explode_vectors,
            label_indexer,
            gbt,
            label_converter,
        ]
    )

    model = pipeline.fit(training_data)

    predictions = model.transform(test_data)

    predictions.select("prediction", "indexed_label").show()

    evaluator = MulticlassClassificationEvaluator(
        labelCol="indexed_label", predictionCol="prediction", metricName="accuracy"
    )

    accuracy = evaluator.evaluate(predictions)

    print(accuracy)

    return model


def _load(model: PipelineModel, emrfsModelPath: str | None = None):
    model.write().overwrite().save(
        os.path.join(emrfsModelPath or "assets/models", "gbt")
    )


if __name__ == "__main__":
    main()
