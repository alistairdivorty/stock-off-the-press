import os
from pymongo import MongoClient
from pymongo.database import Database

db: Database = MongoClient(os.environ["MONGODB_CONNECTION_URI"]).get_default_database()


class PricePipeline:
    def process_item(self, item, spider):
        print(item)
        db.articles.update_one(
            {"_id": item["_id"]},
            {"$set": item},
        )
        return item
