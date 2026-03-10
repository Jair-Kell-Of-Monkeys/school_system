# apps/academic/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend

from .models import AcademicPeriod, AcademicProgram
from .serializers import (
    AcademicPeriodListSerializer,
    AcademicPeriodDetailSerializer,
    AcademicPeriodCreateUpdateSerializer,
    AcademicProgramListSerializer,
    AcademicProgramDetailSerializer,
    AcademicProgramCreateUpdateSerializer,
    ProgramCapacitySerializer,
)
from .filters import AcademicPeriodFilter, AcademicProgramFilter
from .permissions import IsAdminOrServiciosEscolares


class AcademicPeriodViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar periodos académicos
    
    list: Listar todos los periodos
    retrieve: Ver detalle de un periodo
    create: Crear nuevo periodo
    update: Actualizar periodo completo
    partial_update: Actualizar campos específicos
    destroy: Eliminar periodo
    """
    
    queryset = AcademicPeriod.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = AcademicPeriodFilter
    search_fields = ['name']
    ordering_fields = ['start_date', 'end_date', 'name', 'created_at']
    ordering = ['-start_date']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AcademicPeriodListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AcademicPeriodCreateUpdateSerializer
        return AcademicPeriodDetailSerializer
    
    def get_permissions(self):
        """Solo admin y servicios escolares pueden modificar"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrServiciosEscolares()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """
        Obtener el periodo activo actual
        
        GET /api/academic/periods/active/
        """
        try:
            period = AcademicPeriod.objects.get(is_active=True)
            serializer = AcademicPeriodDetailSerializer(period)
            return Response(serializer.data)
        except AcademicPeriod.DoesNotExist:
            return Response(
                {'error': 'No hay periodo activo'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """
        Obtener el periodo en curso (basado en fechas)
        
        GET /api/academic/periods/current/
        """
        from django.utils import timezone
        today = timezone.now().date()
        
        try:
            period = AcademicPeriod.objects.get(
                start_date__lte=today,
                end_date__gte=today
            )
            serializer = AcademicPeriodDetailSerializer(period)
            return Response(serializer.data)
        except AcademicPeriod.DoesNotExist:
            return Response(
                {'error': 'No hay periodo en curso'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], url_path='enrollment-open')
    def enrollment_open(self, request):
        """
        Obtener periodos con inscripciones abiertas
        
        GET /api/academic/periods/enrollment-open/
        """
        from django.utils import timezone
        today = timezone.now().date()
        
        periods = AcademicPeriod.objects.filter(
            enrollment_start__lte=today,
            enrollment_end__gte=today
        )
        
        serializer = AcademicPeriodListSerializer(periods, many=True)
        return Response(serializer.data)
    
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAdminOrServiciosEscolares],
        url_path='activate'
    )
    def activate(self, request, pk=None):
        """
        Activar un periodo (desactiva los demás)
        
        POST /api/academic/periods/{id}/activate/
        """
        period = self.get_object()
        
        # Desactivar todos los periodos
        AcademicPeriod.objects.update(is_active=False)
        
        # Activar el seleccionado
        period.is_active = True
        period.save()
        
        serializer = AcademicPeriodDetailSerializer(period)
        return Response({
            'message': f'Periodo {period.name} activado correctamente',
            'period': serializer.data
        })


class AcademicProgramViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar programas académicos
    
    list: Listar todos los programas
    retrieve: Ver detalle de un programa
    create: Crear nuevo programa
    update: Actualizar programa completo
    partial_update: Actualizar campos específicos
    destroy: Eliminar programa
    """
    
    queryset = AcademicProgram.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_class = AcademicProgramFilter
    search_fields = ['name', 'code', 'description']
    ordering_fields = ['name', 'code', 'duration', 'created_at']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return AcademicProgramListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AcademicProgramCreateUpdateSerializer
        return AcademicProgramDetailSerializer
    
    def get_permissions(self):
        """Solo admin y servicios escolares pueden modificar"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrServiciosEscolares()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        """
        Listar solo programas activos
        
        GET /api/academic/programs/active/
        """
        programs = self.get_queryset().filter(is_active=True)
        
        page = self.paginate_queryset(programs)
        if page is not None:
            serializer = AcademicProgramListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = AcademicProgramListSerializer(programs, many=True)
        return Response(serializer.data)
    
    @action(
        detail=True,
        methods=['get'],
        url_path='capacity/(?P<period_id>[^/.]+)'
    )
    def capacity(self, request, pk=None, period_id=None):
        """
        Obtener capacidad disponible de un programa en un periodo
        
        GET /api/academic/programs/{id}/capacity/{period_id}/
        """
        program = self.get_object()
        
        try:
            period = AcademicPeriod.objects.get(id=period_id)
        except AcademicPeriod.DoesNotExist:
            return Response(
                {'error': 'Periodo no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        available = program.get_available_capacity(period)
        enrolled = program.max_capacity - available
        
        data = {
            'program_id': program.id,
            'program_name': program.name,
            'program_code': program.code,
            'period_id': period.id,
            'period_name': period.name,
            'max_capacity': program.max_capacity,
            'enrolled_count': enrolled,
            'available_capacity': available,
            'has_capacity': available > 0,
        }
        
        serializer = ProgramCapacitySerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Obtener estadísticas de programas
        
        GET /api/academic/programs/stats/
        """
        total = self.get_queryset().count()
        active = self.get_queryset().filter(is_active=True).count()
        inactive = total - active
        
        stats = {
            'total_programs': total,
            'active_programs': active,
            'inactive_programs': inactive,
            'programs_by_duration': dict(
                self.get_queryset()
                .values('duration')
                .annotate(count=Count('id'))
                .values_list('duration', 'count')
            ),
        }
        
        return Response(stats)