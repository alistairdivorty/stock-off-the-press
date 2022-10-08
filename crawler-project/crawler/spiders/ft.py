import dateutil.parser, json, logging, os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from scrapy.spiders import SitemapSpider
from scrapy.http import Request, JsonRequest
from scrapy.utils.sitemap import Sitemap, sitemap_urls_from_robots
from crawler.items import ArticleItem
from crawler.form_payloads import ft as form_payload

load_dotenv()

logger = logging.getLogger(__name__)
f = Fernet(os.environ["ENCRYPTION_KEY"])


class FtSpider(SitemapSpider):
    name = "ft"
    allowed_domains = ["ft.com"]
    sitemap_urls = ["https://www.ft.com/sitemaps/index.xml"]

    def start_requests(self):
        """Perform login by invoking Lambda function via API."""
        yield JsonRequest(
            os.path.join(os.environ["API_INVOKE_URL"], "ft"),
            callback=self.start_sitemap_requests,
            errback=self.errback,
            method="POST",
            data=json.loads(f.decrypt(form_payload.encode("utf-8"))),
            meta={"dont_retry": True},
        )

    def errback(self, failure):
        """Defer next login attempt."""
        if failure.value.response.status == 401:
            yield failure.request.replace(
                meta={"delay": 600},
                dont_filter=True,
            )

    def start_sitemap_requests(self, response):
        """Return iterable of Request objects for Sitemap index URLs."""
        cookies = response.json()
        for url in self.sitemap_urls:
            yield Request(
                url,
                self._parse_sitemap,
                cb_kwargs={"cookies": cookies},
            )

    def sitemap_filter(self, entries):
        """Filter sitemap entries by their attributes."""
        for entry in entries:
            if entry["loc"].endswith("news.xml"):
                continue
            date_time = dateutil.parser.parse(entry["lastmod"])
            if date_time.year < 2012:
                continue
            yield entry

    def _parse_sitemap(self, response, **kwargs):
        """Recursively schedule requests for Sitemap entries."""
        if response.url.endswith("/robots.txt"):
            for url in sitemap_urls_from_robots(response.text, base_url=response.url):
                yield Request(url, callback=self._parse_sitemap)
        else:
            body = self._get_sitemap_body(response)
            if body is None:
                logger.warning(
                    "Ignoring invalid sitemap: %(response)s",
                    {"response": response},
                    extra={"spider": self},
                )
                return

            s = Sitemap(body)
            it = self.sitemap_filter(s)

            if s.type == "sitemapindex":
                for loc in iterloc(it, self.sitemap_alternate_links):
                    if any(x.search(loc) for x in self._follow):
                        yield Request(
                            loc,
                            callback=self._parse_sitemap,
                            cb_kwargs=response.cb_kwargs,
                        )
            elif s.type == "urlset":
                for loc in iterloc(it, self.sitemap_alternate_links):
                    for r, c in self._cbs:
                        if r.search(loc):
                            yield Request(
                                loc,
                                callback=c,
                                cookies=response.cb_kwargs["cookies"],
                            )
                            break

    def parse(self, response):
        """Parse response and build Article item for further processing."""
        json_ld_news_article = response.xpath(
            '//script[@type="application/ld+json"][1]//text()'
        ).get()

        linked_data_news_article = json.loads(json_ld_news_article)

        if "articleBody" not in linked_data_news_article:
            return
        if linked_data_news_article["headline"].startswith("Letter"):
            return
        if linked_data_news_article["headline"].startswith("FT Crossword"):
            return
        if "description" not in linked_data_news_article:
            return

        json_ld_breadcrumb_list = response.xpath(
            '//script[@type="application/ld+json"][2]//text()'
        ).get()

        linked_data_breadcrumb_list = json.loads(json_ld_breadcrumb_list)

        yield ArticleItem(
            headline=linked_data_news_article["headline"],
            description=linked_data_news_article["description"],
            topic=linked_data_breadcrumb_list["itemListElement"][2]["name"],
            text=linked_data_news_article["articleBody"],
            date_published=dateutil.parser.parse(
                linked_data_news_article["datePublished"]
            ),
        )


def iterloc(it, alt=False):
    """Build iterator of URLs extracted from Sitemap."""
    for d in it:
        yield d["loc"]

        # Also consider alternate URLs (xhtml:link rel="alternate")
        if alt and "alternate" in d:
            yield from d["alternate"]
