# config/urls.py
"""
URL Configuration para School System
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from apps.enrollments.views import verify_enrollment_public

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Autenticación JWT
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/verify/', TokenVerifyView.as_view(), name='token_verify'),
    
    # Apps URLs
    path('api/users/', include('apps.users.urls')),
    path('api/academic/', include('apps.academic.urls')),
    path('api/students/', include('apps.students.urls')),
    path('api/pre-enrollments/', include('apps.pre_enrollment.urls')),
    path('api/enrollments/', include('apps.enrollments.urls')),
    path('api/exams/', include('apps.exams.urls')),
    # Public enrollment verification (QR-accessible, no auth)
    path('api/verify/enrollment/<str:enrollment_id>/', verify_enrollment_public, name='verify-enrollment'),
    #path('api/payments/', include('apps.payments.urls')),
    path('api/credentials/', include('apps.credentials.urls')),
]

# Configuración de MEDIA en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Django Debug Toolbar
    if 'debug_toolbar' in settings.INSTALLED_APPS:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns

# Personalizar admin
admin.site.site_header = "Sistema Universitario - Administración"
admin.site.site_title = "Admin Sistema Universitario"
admin.site.index_title = "Panel de Administración"