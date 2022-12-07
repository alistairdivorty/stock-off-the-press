from inference.transformers.summarizer import Summarizer
from pyspark.ml import PipelineModel


class TestSummarization:
    def test_texts_summarized(self, spark, article):
        df = spark.createDataFrame([{"input": article}])

        df = PipelineModel(
            stages=[
                Summarizer(
                    minLength=100,
                    maxLength=300,
                    lengthPenalty=2.0,
                    numBeams=4,
                )
            ]
        ).transform(df)

        df.show(truncate=False)

        row = df.first()
        assert row is not None
        assert len(row["output"]) < len(row["input"])
