from transformers import BartTokenizer, BartForConditionalGeneration

BartTokenizer.from_pretrained("facebook/bart-large-cnn")
BartForConditionalGeneration.from_pretrained("facebook/bart-large-cnn")
