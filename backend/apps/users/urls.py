# apps/users/urls.py
"""
URLs para autenticación y gestión de usuarios.

Estructura de rutas:
1. Autenticación (/api/users/...)
2. Perfil de usuario (/api/users/me/)
3. Gestión de usuarios - Admin (/api/users/)
4. Gestión de encargados - Jefa (/api/users/servicios-escolares-staff/)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    UserProfileView,
    ChangePasswordView,
    UserViewSet,
    CheckEmailView,
    CurpLookupView,
    ServiciosEscolaresManagementViewSet,
    VerifyEmailView,
    ResendVerificationEmailView,
    ForgotPasswordView,
    ResetPasswordView,
)

# ============================================================================
# ROUTER PARA VIEWSETS
# ============================================================================

router = DefaultRouter()

# ViewSet de usuarios (para admin)
# Genera rutas: /api/users/, /api/users/{id}/, etc.
router.register(r'users', UserViewSet, basename='user')

# ViewSet de gestión de encargados (para jefa de servicios escolares)
# Genera rutas: /api/users/servicios-escolares-staff/, etc.
router.register(
    r'servicios-escolares-staff',
    ServiciosEscolaresManagementViewSet,
    basename='servicios-escolares-staff'
)

# ============================================================================
# URLS PRINCIPALES
# ============================================================================

urlpatterns = [
    # ========================================================================
    # AUTENTICACIÓN
    # ========================================================================
    
    # Registro de nuevos usuarios (aspirantes)
    # POST /api/users/register/
    path('register/', RegisterView.as_view(), name='register'),
    
    # Login de usuarios
    # POST /api/users/login/
    path('login/', LoginView.as_view(), name='login'),
    
    # Logout (blacklist del refresh token)
    # POST /api/users/logout/
    path('logout/', LogoutView.as_view(), name='logout'),
    
    # ========================================================================
    # PERFIL DE USUARIO
    # ========================================================================
    
    # Ver/actualizar perfil del usuario autenticado
    # GET/PUT/PATCH /api/users/me/
    path('me/', UserProfileView.as_view(), name='user-profile'),
    
    # Cambiar contraseña
    # POST /api/users/change-password/
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # ========================================================================
    # UTILIDADES
    # ========================================================================
    
    # Verificar disponibilidad de email
    # POST /api/users/check-email/
    path('check-email/', CheckEmailView.as_view(), name='check-email'),

    # Consultar datos de una CURP (autofill en registro)
    # GET /api/users/curp-lookup/?curp=XXXX
    path('curp-lookup/', CurpLookupView.as_view(), name='curp-lookup'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationEmailView.as_view(), name='resend-verification'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    # ========================================================================
    # ROUTER URLS
    # ========================================================================
    
    # Incluir todas las rutas del router
    # - Gestión de usuarios (admin)
    # - Gestión de encargados (jefa)
    path('', include(router.urls)),
]