export interface User {
  id: string;
  email: string;
  role: string;
  role_display: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Nuevos tipos
export interface AcademicProgram {
  id: number;
  name: string;
  code: string;
  description: string;
  duration: number;
  max_capacity: number;
  is_active: boolean;
}

export interface ProgramPermission {
  id: number;
  program: number;
  program_name: string;
  program_code: string;
  assigned_by: string;
  assigned_by_email: string;
  assigned_at: string;
}

export interface StaffUser {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  assigned_programs: AcademicProgram[];
  program_permissions: ProgramPermission[];
  date_joined: string;
}

export interface Student {
  id: string;
  user: string;
  first_name: string;
  last_name: string;
  curp: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email: string | null;
  user_email: string;
  city: string;
  state: string;
  photo_status: string;
  created_at: string;
}

export interface PreEnrollment {
  id: string;
  student_name: string;
  student_curp: string;
  program_name: string;
  program_code: string;
  period_name: string;
  status: string;
  status_display: string;
  exam_date: string | null;
  exam_score: number | null;
  submitted_at: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Document {
  id: string;
  document_type: string;
  document_type_display: string;
  file_url: string | null;
  file_name: string;
  file_size: number | null;
  status: string;
  status_display: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
}

export interface PreEnrollmentDetail extends PreEnrollment {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    curp: string;
    email: string | null;
    user_email: string;
    phone: string;
    city: string;
    state: string;
  };
  program: AcademicProgram;
  period: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  documents: Document[];
  exam_date: string | null;
  exam_score: number | null;
  exam_mode: string | null;
  exam_location: string | null;
  notes: string;
  status_history: Array<{
    status: string;
    changed_at: string;
    changed_by: string;
    notes: string;
  }>;
}

export interface Payment {
  id: string;
  pre_enrollment: string;
  student_name: string;
  student_curp: string;
  program_name: string;
  program_code: string;
  payment_type: string;
  payment_type_display: string;
  amount: string;
  receipt_number: string;
  payment_date: string;
  receipt_file: string;
  status: string;
  status_display: string;
  validated_by: string | null;
  validated_by_email: string | null;
  validated_at: string | null;
  validation_notes: string;
  created_at: string;
}

export interface PaymentDetail extends Payment {
  pre_enrollment_detail: {
    id: string;
    student: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
    };
    program: {
      code: string;
      name: string;
    };
    status: string;
  };
}

export interface MyApplication {
  id: string;
  status: string;
  status_display: string;
  program: {
    id: number;
    code: string;
    name: string;
    description: string;
  };
  period: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  documents: Document[];
  exam_date: string | null;
  exam_score: number | null;
  exam_mode: string | null;
  exam_location: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  notes: string;
}

export interface DocumentUpload {
  document_type: string;
  file: File;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  second_last_name?: string;
  curp: string;
  date_of_birth: string;
  gender: string;
  phone?: string;
  city?: string;
  state?: string;
}

export interface Announcement {
  id: string;
  period: number;
  period_name: string;
  title: string;
  description: string;
  deadline: string | null;
  is_active: boolean;
  is_open: boolean;
  published_at: string;
}

export interface ExamVenue {
  id: string;
  program: number;
  program_name: string;
  program_code: string;
  building: string;
  room: string;
  capacity: number;
  location_display: string;
  created_at: string;
}

export interface ExamSession {
  id: string;
  name: string;
  period: number;
  period_name: string;
  exam_date: string;
  exam_time: string;
  mode: string;
  exam_type: string;
  passing_score: number;
  status: string;
  status_display: string;
  created_by_email: string | null;
  venue_count: number;
  total_capacity: number;
  created_at: string;
}

export interface ExamSessionDetail extends ExamSession {
  venues: ExamVenue[];
  updated_at: string;
}

export interface ExamAspirant {
  id: string;
  student_name: string;
  student_curp: string;
  program_name: string;
  program_code: string;
  exam_location: string | null;
  exam_date: string | null;
  exam_score: string | null;
  status: string;
  status_display: string;
}

export interface AspirantCount {
  program_id: number;
  program_code: string;
  program_name: string;
  aspirant_count: number;
}

export interface CapacityStatus {
  program_id: number;
  program_code: string;
  program_name: string;
  max_capacity: number;
  accepted_count: number;
  available_spots: number;
}

export interface EnrollmentDocument {
  id: string;
  document_type: string;
  document_type_display: string;
  file_url: string | null;
  file_name: string;
  file_size: number | null;
  status: string;
  status_display: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
}

export interface Enrollment {
  id: string;
  matricula: string;
  status: string;
  status_display: string;
  student_name: string;
  student_curp: string;
  program_name: string;
  program_code: string;
  period_name: string;
  institutional_email: string | null;
  group: string | null;
  schedule: string | null;
  enrolled_at: string | null;
  created_at: string;
}

export interface CredentialConvocatoria {
  id: string;
  title: string;
  description: string | null;
  requirements: string | null;
  period: number;
  period_name: string;
  fecha_inicio: string;
  fecha_fin: string;
  status: string;
  status_display: string;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CredentialRequest {
  id: string;
  convocatoria: string;
  convocatoria_title: string;
  enrollment: string;
  status: string;
  status_display: string;
  student_name: string;
  student_curp: string;
  matricula: string;
  program_name: string;
  program_code: string;
  period_name: string;
  photo_url: string | null;
  rejection_reason: string | null;
  credential_id: string | null;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  requested_at: string;
  reviewed_at: string | null;
  updated_at: string;
}

export interface EnrollmentDetail extends Enrollment {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    curp: string;
    email: string | null;
    user_email: string;
    phone: string;
    institutional_email: string | null;
  };
  program: {
    id: number;
    code: string;
    name: string;
  };
  period: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  pre_enrollment: string | null;
  group: string | null;
  schedule: string | null;
  documents: EnrollmentDocument[];
  updated_at: string;
}