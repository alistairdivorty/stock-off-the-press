# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class ArticleItem(scrapy.Item):
    _id = scrapy.Field()
    headline = scrapy.Field()
    description = scrapy.Field()
    topic = scrapy.Field()
    topic_url_path = scrapy.Field()
    text = scrapy.Field()
    date_published = scrapy.Field()
    source = scrapy.Field()
    summary = scrapy.Field()
    corp = scrapy.Field()
    symbol = scrapy.Field()
    exchange = scrapy.Field()
    price = scrapy.Field()


class SymbolItem(scrapy.Item):
    code = scrapy.Field()
    name = scrapy.Field()
    country = scrapy.Field()
    exchange = scrapy.Field()
    currency = scrapy.Field()
    type = scrapy.Field()
    isin = scrapy.Field()
