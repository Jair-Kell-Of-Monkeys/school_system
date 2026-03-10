import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/atoms/Card/Card';
import { Button } from '@/components/atoms/Button/Button';
import { Badge } from '@/components/atoms/Badge/Badge';
import { ROUTES, ROLES } from '@/config/constants';
import { staffService } from '@/services/staff/staffService';
import { studentsService } from '@/services/students/studentsService';
import { preEnrollmentsService } from '@/services/preEnrollments/preEnrollmentsService';
import { aspirantService } from '@/services/aspirant/aspirantService';
import {
  GraduationCap,
  FileText,
  TrendingUp,
  ArrowRight,
  UserCog,
  AlertCircle,
  DollarSign,
  Bell,
  CalendarDays,
} from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Cargar estadísticas según el rol
  const { data: staffStats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: staffService.getStats,
    enabled: user?.role === ROLES.JEFE_SERVICIOS || user?.role === ROLES.ADMIN,
  });

  const { data: studentsStats } = useQuery({
    queryKey: ['students-stats'],
    queryFn: studentsService.getStats,
    enabled: user?.role !== ROLES.ASPIRANTE,
  });

  const { data: preEnrollmentsStats } = useQuery({
    queryKey: ['pre-enrollments-stats'],
    queryFn: preEnrollmentsService.getStats,
    enabled: user?.role !== ROLES.ASPIRANTE,
  });

  // Para aspirantes, obtener su solicitud y convocatorias abiertas
  const { data: myApplication } = useQuery({
    queryKey: ['my-application'],
    queryFn: aspirantService.getMyApplication,
    enabled: user?.role === ROLES.ASPIRANTE,
    retry: false,
  });

  const { data: openAnnouncements = [] } = useQuery({
    queryKey: ['open-announcements'],
    queryFn: aspirantService.getOpenAnnouncements,
    enabled: user?.role === ROLES.ASPIRANTE,
    retry: false,
  });

  // Determinar qué mostrar según el rol
  const isJefeOrAdmin = user?.role === ROLES.JEFE_SERVICIOS || user?.role === ROLES.ADMIN;
  const isEncargado = user?.role === ROLES.SERVICIOS_ESCOLARES;
  const isFinanzas = user?.role === ROLES.FINANZAS;
  const isAspirante = user?.role === ROLES.ASPIRANTE;

  // Dashboard para Aspirantes
  if (isAspirante) {
    const hasOpenAnnouncement = openAnnouncements.length > 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {user?.email}
          </h1>
          <p className="text-gray-600 mt-2">
            Rol: <span className="font-semibold">{user?.role_display}</span>
          </p>
        </div>

        {/* Convocatorias abiertas */}
        {hasOpenAnnouncement && (
          <Card className="border-l-4 border-primary-500 bg-primary-50">
            <div className="flex items-start">
              <Bell className="text-primary-600 mr-3 mt-1 shrink-0" size={22} />
              <div className="flex-1">
                <h2 className="font-semibold text-primary-900 mb-2">
                  Convocatoria{openAnnouncements.length > 1 ? 's' : ''} Abierta{openAnnouncements.length > 1 ? 's' : ''}
                </h2>
                <div className="space-y-2">
                  {openAnnouncements.map((ann) => (
                    <div key={ann.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-primary-800">{ann.title}</p>
                        <p className="text-xs text-primary-700">Periodo: {ann.period_name}</p>
                      </div>
                      {ann.deadline && (
                        <div className="flex items-center text-xs text-primary-700">
                          <CalendarDays size={12} className="mr-1" />
                          Cierre:{' '}
                          {new Date(ann.deadline).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Mi solicitud */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Mi Proceso de Admisión
          </h2>
          {myApplication ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Estado Actual</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {myApplication.status_display}
                  </p>
                </div>
                <Badge
                  variant={
                    myApplication.status === 'accepted'
                      ? 'success'
                      : myApplication.status === 'rejected'
                      ? 'danger'
                      : 'info'
                  }
                >
                  {myApplication.status_display}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Programa</p>
                <p className="font-medium text-gray-900">
                  {myApplication.program?.code} - {myApplication.program?.name}
                </p>
              </div>
              {myApplication.exam_score != null && (
                <div>
                  <p className="text-sm text-gray-600">Calificación del Examen</p>
                  <p className="text-3xl font-bold text-green-600">
                    {myApplication.exam_score}/100
                  </p>
                </div>
              )}
              <Button onClick={() => navigate('/my-application')}>
                Ver Mi Solicitud
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              {hasOpenAnnouncement ? (
                <>
                  <p className="text-gray-600 mb-4">
                    Hay una convocatoria abierta. Crea tu solicitud de admisión ahora.
                  </p>
                  <Button onClick={() => navigate('/my-application')}>
                    Crear Solicitud
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </>
              ) : (
                <p className="text-gray-500">
                  No hay convocatorias abiertas en este momento.
                  <br />
                  <span className="text-sm">Vuelve a consultar cuando se publique una nueva convocatoria.</span>
                </p>
              )}
            </div>
          )}
        </Card>

      </div>
    );
  }

  // Dashboard para Finanzas
  if (isFinanzas) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenido, {user?.email}
          </h1>
          <p className="text-gray-600 mt-2">
            Rol: <span className="font-semibold">{user?.role_display}</span>
          </p>
        </div>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Accesos Rápidos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/payments')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <DollarSign className="text-primary-600 mb-2" size={24} />
              <p className="font-medium text-gray-900">Validar Pagos</p>
              <p className="text-sm text-gray-500 mt-1">
                Revisar y validar comprobantes de pago
              </p>
            </button>

            <button
              onClick={() => navigate(ROUTES.PRE_ENROLLMENTS)}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <FileText className="text-primary-600 mb-2" size={24} />
              <p className="font-medium text-gray-900">Pre-inscripciones</p>
              <p className="text-sm text-gray-500 mt-1">
                Ver solicitudes de admisión
              </p>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Dashboard para Admin, Jefa y Encargados
  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.email}
        </h1>
        <p className="text-gray-600 mt-2">
          Rol: <span className="font-semibold">{user?.role_display}</span>
        </p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Encargados (solo para Jefa) */}
        {isJefeOrAdmin && staffStats && (
          <>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Encargados</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {staffStats.total_encargados}
                  </p>
                </div>
                <UserCog className="text-primary-600" size={40} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate(ROUTES.STAFF)}
              >
                Ver todos
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Sin Programas</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">
                    {staffStats.encargados_sin_programas}
                  </p>
                </div>
                <AlertCircle className="text-yellow-600" size={40} />
              </div>
              {staffStats.encargados_sin_programas > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(ROUTES.STAFF)}
                >
                  Asignar programas
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
            </Card>
          </>
        )}

        {/* Estudiantes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">
                {isEncargado ? 'Mis Estudiantes' : 'Estudiantes'}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {studentsStats?.total || 0}
              </p>
            </div>
            <GraduationCap className="text-primary-600" size={40} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate(ROUTES.STUDENTS)}
          >
            Ver lista
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </Card>

        {/* Pre-inscripciones */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Pre-inscripciones</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {preEnrollmentsStats?.total || 0}
              </p>
            </div>
            <FileText className="text-primary-600" size={40} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => navigate(ROUTES.PRE_ENROLLMENTS)}
          >
            Gestionar
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </Card>
      </div>

      {/* Acciones pendientes */}
      {preEnrollmentsStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En Revisión</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {preEnrollmentsStats.by_status?.under_review || 0}
                </p>
              </div>
              <div className="text-3xl">👀</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Solicitudes esperando revisión de documentos
            </p>
          </Card>

          <Card className="border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Exámenes Programados</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {preEnrollmentsStats.by_status?.exam_scheduled || 0}
                </p>
              </div>
              <div className="text-3xl">📝</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Aspirantes con examen pendiente
            </p>
          </Card>

          <Card className="border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasa de Aceptación</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {preEnrollmentsStats.acceptance_rate 
                    ? `${Math.round(preEnrollmentsStats.acceptance_rate)}%` 
                    : '-'}
                </p>
              </div>
              <TrendingUp className="text-green-600" size={32} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {preEnrollmentsStats.by_status?.accepted || 0} aspirantes aceptados
            </p>
          </Card>
        </div>
      )}

      {/* Accesos rápidos */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isJefeOrAdmin && (
            <button
              onClick={() => navigate(ROUTES.STAFF)}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
            >
              <UserCog className="text-primary-600 mb-2" size={24} />
              <p className="font-medium text-gray-900">Gestionar Encargados</p>
              <p className="text-sm text-gray-500 mt-1">
                Asignar programas y permisos
              </p>
            </button>
          )}

          <button
            onClick={() => navigate(ROUTES.STUDENTS)}
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
          >
            <GraduationCap className="text-primary-600 mb-2" size={24} />
            <p className="font-medium text-gray-900">
              {isEncargado ? 'Mis Estudiantes' : 'Ver Estudiantes'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Lista completa de aspirantes y alumnos
            </p>
          </button>

          <button
            onClick={() => navigate(ROUTES.PRE_ENROLLMENTS)}
            className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left"
          >
            <FileText className="text-primary-600 mb-2" size={24} />
            <p className="font-medium text-gray-900">Pre-inscripciones</p>
            <p className="text-sm text-gray-500 mt-1">
              Revisar y gestionar solicitudes
            </p>
          </button>
        </div>
      </Card>
    </div>
  );
};