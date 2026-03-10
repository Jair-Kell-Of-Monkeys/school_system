# apps/pre_enrollment/admin.py
from django.contrib import admin
from django.utils.html import format_html
from .models import PreEnrollment, Document, Announcement


class DocumentInline(admin.TabularInline):
    """Inline para documentos en pre-inscripción"""
    model = Document
    extra = 0
    readonly_fields = ['uploaded_at', 'reviewed_at', 'file_size']
    fields = [
        'document_type',
        'file_path',
        'status',
        'reviewer_notes',
        'reviewed_by',
        'uploaded_at',
    ]


@admin.register(PreEnrollment)
class PreEnrollmentAdmin(admin.ModelAdmin):
    list_display = [
        'get_student_name',
        'get_student_curp',
        'program',
        'period',
        'status_badge',
        'exam_date',
        'exam_score',
        'submitted_at',
        'created_at',
    ]
    list_filter = [
        'status',
        'program',
        'period',
        'exam_mode',
        'submitted_at',
        'created_at',
    ]
    search_fields = [
        'student__first_name',
        'student__last_name',
        'student__curp',
        'program__name',
        'program__code',
    ]
    readonly_fields = [
        'id',
        'created_at',
        'updated_at',
        'submitted_at',
        'reviewed_at',
        'approved_at',
        'exam_completed_at',
    ]
    inlines = [DocumentInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('id', 'student', 'program', 'period', 'status')
        }),
        ('Examen de Admisión', {
            'fields': (
                'exam_date',
                'exam_mode',
                'exam_location',
                'exam_score',
                'exam_completed_at',
            )
        }),
        ('Auditoría de Proceso', {
            'fields': (
                'submitted_at',
                'reviewed_at',
                'reviewed_by',
                'approved_at',
                'approved_by',
                'notes',
            ),
            'classes': ('collapse',)
        }),
        ('Fechas', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_student_name(self, obj):
        return obj.student.get_full_name()
    get_student_name.short_description = 'Estudiante'
    get_student_name.admin_order_field = 'student__first_name'
    
    def get_student_curp(self, obj):
        return obj.student.curp
    get_student_curp.short_description = 'CURP'
    get_student_curp.admin_order_field = 'student__curp'
    
    def status_badge(self, obj):
        colors = {
            'draft': 'gray',
            'submitted': 'blue',
            'under_review': 'orange',
            'documents_rejected': 'red',
            'documents_approved': 'green',
            'payment_pending': 'orange',
            'payment_submitted': 'blue',
            'payment_validated': 'green',
            'exam_scheduled': 'purple',
            'exam_completed': 'blue',
            'accepted': 'green',
            'rejected': 'red',
            'cancelled': 'gray',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Estado'
    
    actions = ['mark_as_under_review', 'approve_documents', 'reject_documents']
    
    def mark_as_under_review(self, request, queryset):
        updated = queryset.filter(status='submitted').update(
            status='under_review',
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
        self.message_user(
            request,
            f'{updated} pre-inscripciones marcadas en revisión.'
        )
    mark_as_under_review.short_description = 'Marcar como en revisión'
    
    def approve_documents(self, request, queryset):
        updated = queryset.filter(status='under_review').update(
            status='payment_pending',
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
        self.message_user(
            request,
            f'{updated} documentos aprobados.'
        )
    approve_documents.short_description = 'Aprobar documentos'
    
    def reject_documents(self, request, queryset):
        updated = queryset.filter(status='under_review').update(
            status='documents_rejected',
            reviewed_at=timezone.now(),
            reviewed_by=request.user,
        )
        self.message_user(
            request,
            f'{updated} documentos rechazados.'
        )
    reject_documents.short_description = 'Rechazar documentos'


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = [
        'get_student_name',
        'document_type_display',
        'status_badge',
        'file_name',
        'file_size_display',
        'uploaded_at',
        'reviewed_at',
    ]
    list_filter = [
        'document_type',
        'status',
        'uploaded_at',
        'reviewed_at',
    ]
    search_fields = [
        'pre_enrollment__student__first_name',
        'pre_enrollment__student__last_name',
        'file_name',
    ]
    readonly_fields = [
        'id',
        'file_name',
        'file_size',
        'mime_type',
        'uploaded_at',
        'created_at',
        'updated_at',
        'display_file',
    ]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('id', 'pre_enrollment', 'document_type', 'status')
        }),
        ('Archivo', {
            'fields': (
                'file_path',
                'display_file',
                'file_name',
                'file_size',
                'mime_type',
                'uploaded_at',
            )
        }),
        ('Revisión', {
            'fields': (
                'reviewer_notes',
                'reviewed_by',
                'reviewed_at',
            )
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_student_name(self, obj):
        return obj.pre_enrollment.student.get_full_name()
    get_student_name.short_description = 'Estudiante'
    
    def document_type_display(self, obj):
        return obj.get_document_type_display()
    document_type_display.short_description = 'Tipo de Documento'
    
    def status_badge(self, obj):
        colors = {
            'pending': 'orange',
            'approved': 'green',
            'rejected': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Estado'
    
    def file_size_display(self, obj):
        if obj.file_size:
            # Convertir bytes a KB/MB
            size_kb = obj.file_size / 1024
            if size_kb < 1024:
                return f"{size_kb:.2f} KB"
            else:
                return f"{size_kb / 1024:.2f} MB"
        return "N/A"
    file_size_display.short_description = 'Tamaño'
    
    def display_file(self, obj):
        if obj.file_path:
            ext = obj.file_name.lower().split('.')[-1]
            if ext in ['jpg', 'jpeg', 'png', 'gif']:
                return format_html(
                    '<img src="{}" style="max-width: 300px; max-height: 300px;" />',
                    obj.file_path.url
                )
            else:
                return format_html(
                    '<a href="{}" target="_blank">Ver archivo</a>',
                    obj.file_path.url
                )
        return "Sin archivo"
    display_file.short_description = 'Vista Previa'
    
    actions = ['approve_documents', 'reject_documents']
    
    def approve_documents(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(
            status='approved',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(
            request,
            f'{updated} documentos aprobados.'
        )
    approve_documents.short_description = 'Aprobar documentos seleccionados'
    
    def reject_documents(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(status='pending').update(
            status='rejected',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
        )
        self.message_user(
            request,
            f'{updated} documentos rechazados.'
        )
    reject_documents.short_description = 'Rechazar documentos seleccionados'


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'period',
        'deadline',
        'is_active_badge',
        'is_open_badge',
        'published_at',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'period',
        'published_at',
        'deadline',
    ]
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('period', 'title', 'description')
        }),
        ('Archivo', {
            'fields': ('announcement_file',)
        }),
        ('Publicación', {
            'fields': ('published_at', 'deadline', 'is_active')
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_active_badge(self, obj):
        color = 'green' if obj.is_active else 'red'
        text = 'Activa' if obj.is_active else 'Inactiva'
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, text
        )
    is_active_badge.short_description = 'Estado'
    
    def is_open_badge(self, obj):
        color = 'green' if obj.is_open else 'gray'
        text = 'Abierta' if obj.is_open else 'Cerrada'
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            color, text
        )
    is_open_badge.short_description = 'Convocatoria'