import os, json
from pymongo import MongoClient
from pymongo.database import Database
from bson import json_util

db: Database = MongoClient(os.environ["MONGODB_CONNECTION_URI"]).get_default_database()


def parse_bson(data):
    return json.loads(json_util.dumps(data))
