# apps/credentials/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CredentialConvocatoriaViewSet,
    CredentialRequestViewSet,
    CredentialDownloadView,
    CredentialVerifyView,
)

router = DefaultRouter()
router.register('convocatorias', CredentialConvocatoriaViewSet, basename='credential-convocatoria')
router.register('requests', CredentialRequestViewSet, basename='credential-request')

urlpatterns = [
    path('', include(router.urls)),
    path('<uuid:credential_id>/download/', CredentialDownloadView.as_view(), name='credential-download'),
    path('verify/<str:matricula>/', CredentialVerifyView.as_view(), name='credential-verify'),
]
