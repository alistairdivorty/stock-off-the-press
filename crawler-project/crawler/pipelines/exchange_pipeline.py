import os
from pymongo import MongoClient
from pymongo.database import Database

db: Database = MongoClient(os.environ["MONGODB_CONNECTION_URI"]).get_default_database()


class ExchangePipeline:
    def process_item(self, item, spider):
        db.symbols.update_one(
            {"isin": item["isin"]},
            {"$set": item},
            upsert=True,
        )
        return item
