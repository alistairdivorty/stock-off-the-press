from inference.transformers.vectorizer import Vectorizer
from pyspark.ml import PipelineModel
from pyspark.sql.types import StructField, ArrayType
from pyspark.ml.linalg import VectorUDT


class TestVectorization:
    def test_texts_vectorized(self, spark, article):
        df = spark.createDataFrame([{"input": article}])

        df = PipelineModel(stages=[Vectorizer(cleanAnnotations=False)]).transform(df)

        df.show()

        row = df.first()
        assert row is not None
        assert (
            StructField("embeddings", ArrayType(VectorUDT(), True), True)
            in df.schema.fields
        )
