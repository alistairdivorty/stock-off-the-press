from django.http import JsonResponse
from core.utils import db, parse_bson


def index(request):
    articles = db.articles.find({}, {"headline": 1}).limit(10)

    return JsonResponse(
        parse_bson(list(articles)),
        safe=False,
    )
