# apps/students/views.py
import logging
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django_filters.rest_framework import DjangoFilterBackend

logger = logging.getLogger(__name__)

from .models import Student
from .serializers import (
    StudentListSerializer,
    StudentDetailSerializer,
    StudentCreateSerializer,
    StudentUpdateSerializer,
    PhotoReviewSerializer,
    StudentStatsSerializer,
)
from .filters import StudentFilter
from .permissions import IsAdminOrServiciosEscolares


class StudentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar estudiantes
    
    list: Listar todos los estudiantes
    retrieve: Ver detalle de un estudiante
    create: Crear nuevo estudiante
    update: Actualizar estudiante completo
    partial_update: Actualizar campos específicos
    destroy: Eliminar estudiante
    """
    
    queryset = Student.objects.select_related(
        'user',
        'photo_reviewed_by'
    ).all()
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = StudentFilter
    search_fields = [
        'first_name',
        'last_name',
        'curp',
        'institutional_email',
        'user__email'
    ]
    ordering_fields = [
        'created_at',
        'first_name',
        'last_name',
        'date_of_birth'
    ]
    ordering = ['-created_at']

    def get_queryset(self):
        """Filtrar estudiantes por programas accesibles"""
        queryset = Student.objects.select_related('user').all()

        # Si es servicios escolares (no jefe), filtrar por programas asignados
        if self.request.user.role == 'servicios_escolares':
            program_ids = list(
                self.request.user.get_accessible_programs().values_list('id', flat=True)
            )
            logger.debug(
                '[StudentViewSet.get_queryset] user=%s program_ids=%s',
                self.request.user.email, program_ids
            )
            queryset = queryset.filter(
                pre_enrollments__program_id__in=program_ids
            ).distinct()
            logger.debug(
                '[StudentViewSet.get_queryset] → %d estudiantes tras filtrar',
                queryset.count()
            )

        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list':
            return StudentListSerializer
        elif self.action == 'create':
            return StudentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return StudentUpdateSerializer
        return StudentDetailSerializer
    
    def get_permissions(self):
        """Permisos específicos por acción"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrServiciosEscolares()]
        return super().get_permissions()
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='review-photo'
    )
    def review_photo(self, request, pk=None):
        """
        Aprobar o rechazar la fotografía de un estudiante
        
        POST /api/students/{id}/review-photo/
        Body: {
            "action": "approve" | "reject",
            "rejection_reason": "motivo" (requerido si action=reject)
        }
        """
        student = self.get_object()
        serializer = PhotoReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if not student.can_approve_photo():
            return Response(
                {'error': 'No hay fotografía pendiente de revisión'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        action_type = serializer.validated_data['action']
        
        if action_type == 'approve':
            student.photo_status = 'approved'
            student.photo_reviewed_by = request.user
            student.photo_reviewed_at = timezone.now()
            student.photo_rejection_reason = None
            student.save()
            
            return Response({
                'message': 'Fotografía aprobada correctamente',
                'student': StudentDetailSerializer(student).data
            })
        
        else:  # reject
            student.photo_status = 'rejected'
            student.photo_reviewed_by = request.user
            student.photo_reviewed_at = timezone.now()
            student.photo_rejection_reason = serializer.validated_data['rejection_reason']
            student.save()
            
            return Response({
                'message': 'Fotografía rechazada',
                'student': StudentDetailSerializer(student).data
            })
    
    @action(
        detail=False,
        methods=['get'],
        url_path='pending-photos'
    )
    def pending_photos(self, request):
        """
        Listar estudiantes con fotografías pendientes de revisión
        
        GET /api/students/pending-photos/
        """
        students = self.get_queryset().filter(
            photo_status='pending',
            photo__isnull=False
        )
        
        page = self.paginate_queryset(students)
        if page is not None:
            serializer = StudentListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = StudentListSerializer(students, many=True)
        return Response(serializer.data)
    
    @action(
        detail=False,
        methods=['get'],
        url_path='stats'
    )
    def stats(self, request):
        """
        Obtener estadísticas de estudiantes
        
        GET /api/students/stats/
        """
        queryset = self.get_queryset()
        
        # Total de estudiantes
        total = queryset.count()
        
        # Por género
        by_gender = dict(
            queryset.values('gender')
            .annotate(count=Count('id'))
            .values_list('gender', 'count')
        )
        
        # Por estado
        by_state = dict(
            queryset.exclude(state__isnull=True)
            .values('state')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
            .values_list('state', 'count')
        )
        
        # Por nivel educativo
        by_education = dict(
            queryset.exclude(education_level__isnull=True)
            .values('education_level')
            .annotate(count=Count('id'))
            .values_list('education_level', 'count')
        )
        
        # Por estado de foto
        by_photo_status = dict(
            queryset.values('photo_status')
            .annotate(count=Count('id'))
            .values_list('photo_status', 'count')
        )
        
        # Registros recientes (últimos 30 días)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent = queryset.filter(created_at__gte=thirty_days_ago).count()
        
        stats_data = {
            'total_students': total,
            'by_gender': by_gender,
            'by_state': by_state,
            'by_education_level': by_education,
            'by_photo_status': by_photo_status,
            'recent_registrations': recent,
        }
        
        serializer = StudentStatsSerializer(stats_data)
        return Response(serializer.data)
    
    @action(
        detail=True,
        methods=['get'],
        url_path='me'
    )
    def me(self, request):
        """
        Obtener el perfil del estudiante autenticado
        
        GET /api/students/me/
        """
        try:
            student = Student.objects.get(user=request.user)
            serializer = StudentDetailSerializer(student)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response(
                {'error': 'No existe perfil de estudiante para este usuario'},
                status=status.HTTP_404_NOT_FOUND
            )