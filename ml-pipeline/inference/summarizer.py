from pandas.core.frame import DataFrame
from pandas.core.series import Series
import mlflow


class Summarizer(mlflow.pyfunc.PythonModel):
    def __init__(self):
        from transformers import (
            BartForConditionalGeneration,
            BartTokenizer,
        )

        self.model = BartForConditionalGeneration.from_pretrained(
            "facebook/bart-large-cnn"
        )
        self.tokenizer = BartTokenizer.from_pretrained("facebook/bart-large-cnn")

    def predict(self, context, model_input: DataFrame) -> DataFrame:
        return model_input.apply(self.summarize, axis=1)

    def summarize(self, row: Series) -> str:
        input_tensors = self.tokenizer(
            row.input,
            return_tensors="pt",
            max_length=1024,
            truncation=True,
        )

        output_tensors = self.model.generate(
            input_tensors["input_ids"],
            min_length=row.min_length,
            max_length=row.max_length,
            num_beams=row.num_beams,
            length_penalty=row.length_penalty,
        )

        return " ".join(
            self.tokenizer.decode(
                g, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )
            for g in output_tensors
        )
