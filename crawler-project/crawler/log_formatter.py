from scrapy import logformatter
import logging


class QuietLogFormatter(logformatter.LogFormatter):
    def scraped(self, item, response, spider):
        return (
            super().scraped(item, response, spider)
            if spider.settings.getbool("LOG_SCRAPED_ITEMS")
            else None
        )
