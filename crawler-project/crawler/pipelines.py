import os
from pymongo import MongoClient
from pymongo.database import Database

db: Database = MongoClient(os.environ["MONGODB_CONNECTION_URI"]).get_default_database()


class CrawlerPipeline:
    def process_item(self, item, spider):
        db.articles.update_one(
            {"headline": item["headline"]},
            {"$set": item},
            upsert=True,
        )
        return item
