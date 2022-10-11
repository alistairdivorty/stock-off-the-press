from twisted.internet import reactor
from scrapy.crawler import CrawlerRunner
from scrapy.utils.project import get_project_settings
from scrapy.utils.log import configure_logging
from crawler.spiders.ft import FtSpider

configure_logging({"LOG_FORMAT": "%(levelname)s: %(message)s"})

settings = get_project_settings()

runner = CrawlerRunner(settings)

d = runner.crawl(FtSpider)
d.addBoth(lambda _: reactor.stop())
reactor.run()
