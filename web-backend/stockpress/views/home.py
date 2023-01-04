import django
from django.http import HttpResponse


def index(request):
    return HttpResponse(django.get_version())
