# apps/pre_enrollment/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PreEnrollmentViewSet, DocumentViewSet, AnnouncementViewSet
from apps.payments.views import PaymentViewSet

router = DefaultRouter()
router.register(r'pre-enrollments', PreEnrollmentViewSet, basename='pre-enrollment')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]