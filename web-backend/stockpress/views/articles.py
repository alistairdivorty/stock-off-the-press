from datetime import datetime
from django.http import JsonResponse
from core.utils import db, parse_bson


def index(request):
    articles = db.articles.find(
        {
            "prediction": {"$exists": True},
            "date_published": {
                "$gte": datetime.fromisoformat(request.GET["from"]),
            },
        },
        {
            "date_published": 1,
            "headline": 1,
            "description": 1,
            "summary": 1,
            "corp": 1,
            "exchange": 1,
            "symbol": 1,
            "prediction": 1,
        },
    ).sort("date_published", -1)

    return JsonResponse(
        parse_bson(list(articles)),
        safe=False,
    )
