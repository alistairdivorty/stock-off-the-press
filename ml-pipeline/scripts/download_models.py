from transformers import (
    BartForConditionalGeneration,
    BartTokenizer,
)

BartForConditionalGeneration.from_pretrained("facebook/bart-large-cnn")
BartTokenizer.from_pretrained("facebook/bart-large-cnn")
