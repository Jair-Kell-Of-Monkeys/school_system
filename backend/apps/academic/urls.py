# apps/academic/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AcademicPeriodViewSet, AcademicProgramViewSet

router = DefaultRouter()
router.register(r'periods', AcademicPeriodViewSet, basename='period')
router.register(r'programs', AcademicProgramViewSet, basename='program')

urlpatterns = [
    path('', include(router.urls)),
]