# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy


class ArticleItem(scrapy.Item):
    headline = scrapy.Field()
    description = scrapy.Field()
    topic = scrapy.Field()
    text = scrapy.Field()
    date_published = scrapy.Field()
    source = scrapy.Field()
