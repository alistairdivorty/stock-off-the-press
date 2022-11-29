import json
import mlflow
from mlflow.models import ModelSignature
from inference.summarizer import Summarizer

mlflow.pyfunc.save_model(
    "models/facebook_bart_large_cnn",
    python_model=Summarizer(),
    signature=ModelSignature.from_dict(
        {
            "inputs": json.dumps(
                [
                    {"name": "input", "type": "string"},
                    {"name": "min_length", "type": "integer"},
                    {"name": "max_length", "type": "integer"},
                    {"name": "length_penalty", "type": "double"},
                    {"name": "num_beams", "type": "integer"},
                ]
            ),
        }
    ),
)
