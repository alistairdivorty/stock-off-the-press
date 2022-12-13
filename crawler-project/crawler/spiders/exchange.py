import os
from urllib.parse import urlunsplit, urlencode
from dotenv import load_dotenv
import scrapy
from scrapy import Request
from crawler.items import SymbolItem

load_dotenv()

eodhd_api_token = os.environ["EODHD_API_TOKEN"]


class ExchangeSpider(scrapy.Spider):
    name = "exchange"
    custom_settings = {
        "ITEM_PIPELINES": {"crawler.pipelines.exchange_pipeline.ExchangePipeline": 543}
    }

    def __init__(self, year: int | str | None = None, *args, **kwargs):
        super(ExchangeSpider, self).__init__(*args, **kwargs)
        self.start_urls = [eodhd_api_url("exchanges-list")]

    def start_requests(self):
        for url in self.start_urls:
            yield Request(url, callback=self.process_exchange)

    def process_exchange(self, response):
        for exchange in response.json():
            yield Request(
                eodhd_api_url(
                    "exchange-symbol-list",
                    exchange["Code"],
                )
            )

    def parse(self, response):
        for symbol in response.json():
            yield SymbolItem(**{k.lower(): v for k, v in symbol.items()})


def eodhd_api_url(api_slug: str, *path_params, **query_params) -> str:
    return urlunsplit(
        (
            "https",
            "eodhistoricaldata.com",
            os.path.join("api", api_slug, *path_params),
            urlencode(dict(fmt="json", api_token=eodhd_api_token, **query_params)),
            "",
        )
    )
