import os
from datetime import datetime, timedelta
from urllib.parse import urlunsplit, urlencode
import scrapy
from scrapy import Request
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database
from crawler.items import ArticleItem

load_dotenv()

EODHD_API_TOKEN = os.environ["EODHD_API_TOKEN"]
db: Database = MongoClient(os.environ["MONGODB_CONNECTION_URI"]).get_default_database()


class PriceSpider(scrapy.Spider):
    name = "price"
    from_: datetime | None
    custom_settings = {
        "ITEM_PIPELINES": {"crawler.pipelines.price_pipeline.PricePipeline": 543},
        "CONCURRENT_REQUESTS": 3
    }

    def __init__(self, from_: str | None = None, *args, **kwargs):
        super(PriceSpider, self).__init__(*args, **kwargs)
        self.from_ = (
            datetime.strptime(from_, "%Y-%m-%d")
            if from_ is not None
            else datetime.now()
        )

    def start_requests(self):
        articles = (
            ArticleItem(**article)
            for article in db.articles.find(
                {
                    "symbol": {"$exists": True},
                    "date_published": {"$gt": self.from_},
                    "prices": {"$exists": False},
                }
            )
        )

        exchanges = {
            "NYSE": "US",
            "NASDAQ": "US",
            "BATS": "US",
            "OTCQB": "US",
            "PINK": "US",
            "OTCQX": "US",
            "OTCMKTS": "US",
            "NMFQS": "US",
            "NYSE MKT": "US",
            "OTCBB": "US",
            "OTCGREY": "US",
            "BATS": "US",
            "OTC": "US",
        }

        for article in articles:
            yield Request(
                eodhd_api_url(
                    "eod",
                    article["symbol"]
                    + "."
                    + exchanges.get(article["exchange"], article["exchange"]),
                    **{
                        "from": article["date_published"].strftime("%Y-%m-%d"),
                        "to": (article["date_published"] + timedelta(weeks=4)).strftime(
                            "%Y-%m-%d"
                        ),
                    }
                ),
                errback=self.errback,
                cb_kwargs={"article": article},
            )

    def parse(self, response, article: ArticleItem):
        prices = response.json()
        article["prices"] = None if not len(prices) else prices
        yield article

    def errback(self, failure):
        article = failure.request.cb_kwargs["article"]
        article["prices"] = None
        yield article


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
