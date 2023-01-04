from django.urls import path

from .views import home, articles

urlpatterns = [
    path("", home.index, name="index"),
    path("articles/", articles.index, name="articles.index"),
]
