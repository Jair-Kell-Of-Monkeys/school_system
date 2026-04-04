# apps/users/views.py
"""
Vistas para autenticación y gestión de usuarios.
"""

import threading

from rest_framework import viewsets, status, generics, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import update_session_auth_hash, get_user_model
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from .models import User, UserProgramPermission, EmailVerificationToken
from .email_service import send_verification_email, send_welcome_email

from .models import User, UserProgramPermission
from .serializers import (
    UserSerializer,
    UserListSerializer,
    RegisterSerializer,
    LoginSerializer,
    ChangePasswordSerializer,
    UserProfileSerializer,
    UpdateUserRoleSerializer,
    AssignProgramsSerializer,
    UserWithProgramsSerializer,
    UserProgramPermissionSerializer,
)
from .permissions import IsServiciosEscolaresJefe
from core.permissions import IsAdmin


User = get_user_model()


# ============================================================================
# VISTAS DE AUTENTICACIÓN
# ============================================================================

class RegisterView(generics.CreateAPIView):
    """
    Vista para registro de nuevos usuarios (aspirantes).
    Crea la cuenta como inactiva hasta que se verifique el email.
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Crear usuario INACTIVO hasta verificar email
        user = serializer.save(is_active=False)

        # Crear token de verificación
        token = EmailVerificationToken.objects.create(user=user)

        # Enviar email de verificación (async si Celery disponible, sync como fallback)
        email_sent = self._send_verification_email(user, token)

        message = 'Usuario registrado. Revisa tu correo para verificar tu cuenta.'
        if not email_sent:
            message = 'Usuario registrado, pero hubo un error enviando el email. Contacta al administrador.'

        return Response({
            'message': message,
            'email': user.email,
            'email_sent': email_sent,
        }, status=status.HTTP_201_CREATED)

    @staticmethod
    def _send_email_async(func, *args):
        thread = threading.Thread(target=func, args=args)
        thread.daemon = True
        thread.start()

    @staticmethod
    def _send_verification_email(user, token):
        try:
            from .tasks import send_verification_email_task
            send_verification_email_task.delay(user.email, token.token)
            return True
        except Exception:
            RegisterView._send_email_async(send_verification_email, user, token)
            return True


class VerifyEmailView(generics.GenericAPIView):
    """
    Vista para verificar el email con el token recibido.
    
    Endpoint: POST /api/users/verify-email/
    
    Body:
    {
        "token": "el_token_del_email"
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        token_value = request.data.get('token')
        
        if not token_value:
            return Response(
                {'error': 'Token es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            token = EmailVerificationToken.objects.select_related('user').get(
                token=token_value
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {'error': 'Token inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if token.is_used:
            return Response(
                {'error': 'Este token ya fue usado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if token.is_expired:
            return Response(
                {'error': 'El token ha expirado. Por favor regístrate nuevamente.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Activar usuario
        user = token.user
        user.is_active = True
        user.save()

        # Marcar token como usado
        token.is_used = True
        token.save()

        # Enviar email de bienvenida (async si Celery disponible)
        try:
            from .tasks import send_welcome_email_task
            send_welcome_email_task.delay(user.email)
        except Exception:
            thread = threading.Thread(target=send_welcome_email, args=(user,))
            thread.daemon = True
            thread.start()
        
        # Generar tokens JWT para login automático
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': '¡Cuenta verificada exitosamente! Ya puedes iniciar sesión.',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class ResendVerificationEmailView(generics.GenericAPIView):
    """
    Reenviar email de verificación si expiró.
    
    Endpoint: POST /api/users/resend-verification/
    
    Body:
    {
        "email": "usuario@example.com"
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').lower()
        
        if not email:
            return Response(
                {'error': 'Email es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email, is_active=False)
        except User.DoesNotExist:
            # Por seguridad, no revelar si el email existe o no
            return Response({
                'message': 'Si tu cuenta existe y no está verificada, recibirás un nuevo email.'
            })
        
        # Eliminar token anterior si existe
        EmailVerificationToken.objects.filter(user=user).delete()

        # Crear nuevo token
        token = EmailVerificationToken.objects.create(user=user)

        # Enviar email (async si Celery disponible)
        try:
            from .tasks import send_verification_email_task
            send_verification_email_task.delay(user.email, token.token)
        except Exception:
            thread = threading.Thread(target=send_verification_email, args=(user, token))
            thread.daemon = True
            thread.start()

        return Response({
            'message': 'Se envió un nuevo email de verificación.'
        })

class LoginView(generics.GenericAPIView):
    """
    Vista para login de usuarios.
    
    Endpoint: POST /api/users/login/
    
    Body:
    {
        "email": "usuario@example.com",
        "password": "contraseña123"
    }
    
    Response:
    {
        "message": "Login exitoso",
        "user": {...},
        "tokens": {
            "refresh": "...",
            "access": "..."
        }
    }
    """
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.validated_data['user']
        
        # Actualizar último login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Login exitoso',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class LogoutView(generics.GenericAPIView):
    """
    Vista para logout (blacklist del refresh token).
    
    Endpoint: POST /api/users/logout/
    
    Body:
    {
        "refresh": "refresh_token_here"
    }
    
    Response:
    {
        "message": "Logout exitoso"
    }
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response({
                'message': 'Logout exitoso'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# ============================================================================
# VISTAS DE PERFIL DE USUARIO
# ============================================================================

class UserProfileView(generics.RetrieveUpdateAPIView):
    """
    Vista para ver y actualizar el perfil del usuario autenticado.
    
    Endpoints:
    - GET /api/users/me/      - Ver perfil
    - PUT /api/users/me/      - Actualizar perfil completo
    - PATCH /api/users/me/    - Actualizar campos específicos
    
    Response:
    {
        "id": "uuid",
        "email": "usuario@example.com",
        "role": "aspirante",
        "role_display": "Aspirante",
        "is_active": true,
        "date_joined": "2026-01-15T10:30:00Z",
        "last_login": "2026-02-15T18:00:00Z",
        "has_student_profile": true,
        "student_name": "Juan Pérez"
    }
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    
    def get_object(self):
        """Retorna el usuario autenticado"""
        return self.request.user


class ChangePasswordView(generics.GenericAPIView):
    """
    Vista para cambiar contraseña del usuario autenticado.
    
    Endpoint: POST /api/users/change-password/
    
    Body:
    {
        "old_password": "contraseña_actual",
        "new_password": "nueva_contraseña",
        "new_password_confirm": "nueva_contraseña"
    }
    
    Response:
    {
        "message": "Contraseña actualizada exitosamente"
    }
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Cambiar contraseña
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        # Mantener la sesión activa después de cambiar contraseña
        update_session_auth_hash(request, user)
        
        return Response({
            'message': 'Contraseña actualizada exitosamente'
        })


# ============================================================================
# VISTA DE UTILIDADES
# ============================================================================

class CheckEmailView(generics.GenericAPIView):
    """
    Vista para verificar si un email ya está registrado.
    Útil para validación en tiempo real en formularios de registro.
    
    Endpoint: POST /api/users/check-email/
    
    Body:
    {
        "email": "usuario@example.com"
    }
    
    Response:
    {
        "email": "usuario@example.com",
        "exists": true,
        "available": false
    }
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').lower()
        
        if not email:
            return Response(
                {'error': 'Email es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        exists = User.objects.filter(email=email).exists()
        
        return Response({
            'email': email,
            'exists': exists,
            'available': not exists
        })


# ============================================================================
# VIEWSET DE GESTIÓN DE USUARIOS (SOLO ADMIN)
# ============================================================================

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión completa de usuarios.
    Solo accesible por administradores.
    
    Endpoints:
    - GET    /api/users/                     - Listar usuarios
    - POST   /api/users/                     - Crear usuario
    - GET    /api/users/{id}/                - Ver usuario
    - PUT    /api/users/{id}/                - Actualizar usuario completo
    - PATCH  /api/users/{id}/                - Actualizar campos específicos
    - DELETE /api/users/{id}/                - Eliminar usuario
    - POST   /api/users/{id}/update_role/    - Actualizar rol
    - POST   /api/users/{id}/toggle_active/  - Activar/desactivar
    - GET    /api/users/stats/               - Estadísticas de usuarios
    
    Filtros disponibles:
    - ?role=aspirante           - Filtrar por rol
    - ?search=email@example.com - Buscar por email
    """
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['email']
    ordering_fields = ['date_joined', 'email']
    ordering = ['-date_joined']
    
    def get_serializer_class(self):
        """Retorna el serializer apropiado según la acción"""
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'update_role':
            return UpdateUserRoleSerializer
        return UserSerializer
    
    def get_queryset(self):
        """
        Filtrar usuarios por rol si se proporciona el parámetro.
        
        Ejemplos:
        - /api/users/?role=aspirante
        - /api/users/?role=servicios_escolares
        """
        queryset = User.objects.all()
        role = self.request.query_params.get('role', None)
        
        if role:
            queryset = queryset.filter(role=role)
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def update_role(self, request, pk=None):
        """
        Actualizar el rol de un usuario.
        
        Endpoint: POST /api/users/{id}/update_role/
        
        Body:
        {
            "role": "alumno"
        }
        
        Validaciones:
        - Aspirante solo puede pasar a alumno
        - Alumno solo puede mantenerse como alumno
        - Staff puede cambiar a cualquier rol staff
        """
        user = self.get_object()
        serializer = UpdateUserRoleSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'message': 'Rol actualizado exitosamente',
            'user': UserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Activar o desactivar un usuario.
        Útil para deshabilitar temporalmente una cuenta sin eliminarla.
        
        Endpoint: POST /api/users/{id}/toggle_active/
        
        Response:
        {
            "message": "Usuario activado/desactivado exitosamente",
            "user": {...}
        }
        """
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        status_text = 'activado' if user.is_active else 'desactivado'
        
        return Response({
            'message': f'Usuario {status_text} exitosamente',
            'user': UserSerializer(user).data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Estadísticas de usuarios por rol.
        
        Endpoint: GET /api/users/stats/
        
        Response:
        {
            "total_usuarios": 150,
            "usuarios_activos": 145,
            "usuarios_inactivos": 5,
            "por_rol": [
                {"role": "admin", "count": 2},
                {"role": "aspirante", "count": 80},
                {"role": "alumno", "count": 50},
                ...
            ]
        }
        """
        from django.db.models import Count
        
        stats = User.objects.values('role').annotate(
            count=Count('id')
        ).order_by('role')
        
        total = User.objects.count()
        active = User.objects.filter(is_active=True).count()
        
        return Response({
            'total_usuarios': total,
            'usuarios_activos': active,
            'usuarios_inactivos': total - active,
            'por_rol': list(stats)
        })


# ============================================================================
# VIEWSET DE GESTIÓN DE ENCARGADOS DE SERVICIOS ESCOLARES
# Solo accesible por Jefa de Servicios Escolares y Admin
# ============================================================================

class ServiciosEscolaresManagementViewSet(viewsets.ViewSet):
    """
    ViewSet para que la Jefa de Servicios Escolares gestione
    encargados y sus programas asignados.
    
    Funcionalidad principal:
    1. Ver lista de encargados
    2. Asignar/remover programas a encargados
    3. Ver qué programas tiene cada encargado
    
    Endpoints:
    - GET  /api/users/servicios-escolares-staff/                     - Listar encargados
    - GET  /api/users/servicios-escolares-staff/{id}/                - Ver encargado
    - POST /api/users/servicios-escolares-staff/assign-programs/    - Asignar programas
    - POST /api/users/servicios-escolares-staff/{id}/add-program/   - Agregar programa
    - POST /api/users/servicios-escolares-staff/{id}/remove-program/ - Remover programa
    - GET  /api/users/servicios-escolares-staff/stats/              - Estadísticas
    """
    
    permission_classes = [IsServiciosEscolaresJefe]
    
    def list(self, request):
        """
        Listar todos los encargados de Servicios Escolares con sus programas.
        
        Endpoint: GET /api/users/servicios-escolares-staff/
        
        Response:
        [
            {
                "id": "uuid",
                "email": "encargado.tics@universidad.edu.mx",
                "role": "servicios_escolares",
                "is_active": true,
                "assigned_programs": [
                    {"id": 1, "name": "Ing. en Sistemas", "code": "ISC"},
                    {"id": 2, "name": "Ing. en TICS", "code": "TICS"}
                ],
                "program_permissions": [...]
            }
        ]
        """
        users = User.objects.filter(
            role='servicios_escolares'
        ).prefetch_related('program_permissions__program')
        
        serializer = UserWithProgramsSerializer(users, many=True)
        return Response(serializer.data)
    
    def retrieve(self, request, pk=None):
        """
        Ver detalles de un encargado específico.
        
        Endpoint: GET /api/users/servicios-escolares-staff/{id}/
        
        Response:
        {
            "id": "uuid",
            "email": "encargado@universidad.edu.mx",
            "role": "servicios_escolares",
            "assigned_programs": [...],
            "program_permissions": [
                {
                    "id": 1,
                    "program": 1,
                    "program_name": "Ing. en Sistemas",
                    "program_code": "ISC",
                    "assigned_by": "uuid-jefa",
                    "assigned_by_email": "jefa@universidad.edu.mx",
                    "assigned_at": "2026-02-15T10:00:00Z"
                }
            ]
        }
        """
        try:
            user = User.objects.prefetch_related(
                'program_permissions__program'
            ).get(id=pk, role='servicios_escolares')
            
            serializer = UserWithProgramsSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], url_path='assign-programs')
    def assign_programs(self, request):
        """
        Asignar programas a un encargado (reemplaza asignaciones anteriores).
        
        Endpoint: POST /api/users/servicios-escolares-staff/assign-programs/
        
        Body:
        {
            "user_id": "uuid-del-encargado",
            "program_ids": [1, 2, 3]
        }
        
        Comportamiento:
        1. Elimina todas las asignaciones anteriores del usuario
        2. Crea nuevas asignaciones con los programas especificados
        3. Registra quién hizo la asignación (assigned_by)
        
        Response:
        {
            "message": "Programas asignados correctamente a encargado@universidad.edu.mx",
            "user": {...}
        }
        """
        serializer = AssignProgramsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_id = serializer.validated_data['user_id']
        program_ids = serializer.validated_data['program_ids']
        
        user = User.objects.get(id=user_id)

        # Verificar que ningún programa esté ya asignado a OTRO encargado
        conflicts = (
            UserProgramPermission.objects
            .filter(program_id__in=program_ids)
            .exclude(user=user)
            .select_related('program', 'user')
        )
        if conflicts.exists():
            conflict_details = [
                f'"{c.program.name}" (asignado a {c.user.email})'
                for c in conflicts
            ]
            return Response(
                {'error': f'Los siguientes programas ya están asignados a otro encargado: {", ".join(conflict_details)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Eliminar asignaciones anteriores
        UserProgramPermission.objects.filter(user=user).delete()

        # Crear nuevas asignaciones
        from apps.academic.models import AcademicProgram
        permissions = []
        for program_id in program_ids:
            program = AcademicProgram.objects.get(id=program_id)
            permission = UserProgramPermission(
                user=user,
                program=program,
                assigned_by=request.user
            )
            permissions.append(permission)

        # Bulk create para eficiencia
        UserProgramPermission.objects.bulk_create(permissions)
        
        # Retornar usuario actualizado
        user.refresh_from_db()
        response_serializer = UserWithProgramsSerializer(user)
        
        return Response({
            'message': f'Programas asignados correctamente a {user.email}',
            'user': response_serializer.data
        })
    
    @action(detail=True, methods=['post'], url_path='add-program')
    def add_program(self, request, pk=None):
        """
        Agregar un programa adicional a un encargado (sin remover los existentes).
        
        Endpoint: POST /api/users/servicios-escolares-staff/{id}/add-program/
        
        Body:
        {
            "program_id": 4
        }
        
        Comportamiento:
        - Si el programa ya está asignado, retorna mensaje informativo
        - Si no está asignado, lo agrega
        
        Response:
        {
            "message": "Programa GASTRO agregado correctamente"
        }
        """
        try:
            user = User.objects.get(id=pk, role='servicios_escolares')
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        program_id = request.data.get('program_id')
        if not program_id:
            return Response(
                {'error': 'program_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.academic.models import AcademicProgram
        try:
            program = AcademicProgram.objects.get(id=program_id, is_active=True)
        except AcademicProgram.DoesNotExist:
            return Response(
                {'error': 'Programa no encontrado o inactivo'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar que el programa no esté asignado a otro encargado
        conflict = (
            UserProgramPermission.objects
            .filter(program=program)
            .exclude(user=user)
            .select_related('user')
            .first()
        )
        if conflict:
            return Response(
                {'error': f'Este programa ya está asignado a {conflict.user.email}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Intentar crear el permiso (get_or_create previene duplicados)
        permission, created = UserProgramPermission.objects.get_or_create(
            user=user,
            program=program,
            defaults={'assigned_by': request.user}
        )
        
        if created:
            return Response({
                'message': f'Programa {program.code} agregado correctamente'
            })
        else:
            return Response(
                {'message': 'El usuario ya tiene acceso a este programa'},
                status=status.HTTP_200_OK
            )
    
    @action(detail=True, methods=['post'], url_path='remove-program')
    def remove_program(self, request, pk=None):
        """
        Remover un programa de un encargado.
        
        Endpoint: POST /api/users/servicios-escolares-staff/{id}/remove-program/
        
        Body:
        {
            "program_id": 2
        }
        
        Response:
        {
            "message": "Programa removido correctamente"
        }
        
        o si no estaba asignado:
        
        {
            "error": "El usuario no tiene asignado ese programa"
        }
        """
        try:
            user = User.objects.get(id=pk, role='servicios_escolares')
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        program_id = request.data.get('program_id')
        if not program_id:
            return Response(
                {'error': 'program_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Eliminar el permiso
        deleted = UserProgramPermission.objects.filter(
            user=user,
            program_id=program_id
        ).delete()
        
        if deleted[0] > 0:
            return Response({
                'message': 'Programa removido correctamente'
            })
        else:
            return Response(
                {'error': 'El usuario no tiene asignado ese programa'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Estadísticas de encargados y programas.
        
        Endpoint: GET /api/users/servicios-escolares-staff/stats/
        
        Response:
        {
            "total_encargados": 5,
            "encargados_sin_programas": 1,
            "programas_sin_encargado": 2
        }
        
        Útil para:
        - Identificar encargados sin programas asignados
        - Identificar programas sin encargado
        - Dashboard de la jefa
        """
        total_encargados = User.objects.filter(role='servicios_escolares').count()
        
        # Encargados sin programas asignados
        sin_programas = User.objects.filter(
            role='servicios_escolares',
            program_permissions__isnull=True
        ).count()
        
        # Programas sin encargado
        from apps.academic.models import AcademicProgram
        programas_sin_encargado = AcademicProgram.objects.filter(
            is_active=True,
            user_permissions__isnull=True
        ).count()
        
        return Response({
            'total_encargados': total_encargados,
            'encargados_sin_programas': sin_programas,
            'programas_sin_encargado': programas_sin_encargado,
        })