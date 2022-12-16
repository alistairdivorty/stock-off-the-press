import os
from distutils.util import strtobool
from urllib.parse import urlunsplit, urlencode
from dotenv import load_dotenv
import scrapy
from scrapy import Request
from crawler.items import SymbolItem

load_dotenv()

EODHD_API_TOKEN = os.environ["EODHD_API_TOKEN"]


class ExchangeSpider(scrapy.Spider):
    name = "exchange"
    start_urls: list
    delisted: str | int
    custom_settings = {
        "ITEM_PIPELINES": {"crawler.pipelines.exchange_pipeline.ExchangePipeline": 543}
    }

    def __init__(self, delisted: str | int = 0, *args, **kwargs):
        super(ExchangeSpider, self).__init__(*args, **kwargs)
        self.start_urls = [eodhd_api_url("exchanges-list")]
        self.delisted = delisted

    def start_requests(self):
        for url in self.start_urls:
            yield Request(url, callback=self.process_exchange)

    def process_exchange(self, response):
        for exchange in response.json():
            yield Request(
                eodhd_api_url(
                    "exchange-symbol-list", exchange["Code"], delisted=self.delisted
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
            urlencode(dict(fmt="json", api_token=EODHD_API_TOKEN, **query_params)),
            "",
        )
    )
