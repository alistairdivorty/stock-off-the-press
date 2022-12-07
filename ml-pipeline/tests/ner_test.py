from inference.transformers.named_entity_recognizer import NamedEntityRecognizer
from pyspark.ml import PipelineModel


class TestNer:
    def test_named_entities_recognized(self, spark, article):
        df = spark.createDataFrame([{"input": article}])

        df = PipelineModel(
            stages=[NamedEntityRecognizer(cleanAnnotations=False)]
        ).transform(df)

        df.show()

        row = df.first()
        assert row is not None
        assert any(
            entity["word"] == "Baker Hughes" and entity["entity_group"] == "ORG"
            for entity in row["output"]
        )
