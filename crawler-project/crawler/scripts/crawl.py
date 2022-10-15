import argparse
from twisted.internet import reactor
from scrapy.crawler import CrawlerRunner
from scrapy.utils.project import get_project_settings
from scrapy.utils.log import configure_logging
from crawler.spiders.ft import FtSpider

arg_parser = argparse.ArgumentParser()
arg_parser.add_argument("year", type=int, nargs="?", default=None)
args = arg_parser.parse_args()

configure_logging({"LOG_FORMAT": "%(levelname)s: %(message)s"})

settings = get_project_settings()

runner = CrawlerRunner(settings)

d = runner.crawl(FtSpider, year=args.year)
d.addBoth(lambda _: reactor.stop())
reactor.run()
