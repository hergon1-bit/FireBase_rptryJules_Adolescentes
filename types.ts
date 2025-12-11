
export interface Permisos {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface Rol {
  id: number;
  nombre: string;
  permisos: {
    adolescentes: Permisos;
    encargados: Permisos;
    reuniones: Permisos;
    tutores: Permisos;
    eventos: Permisos;
    usuarios: Permisos;
  };
}

export interface Usuario {
  id: string; // Changed from number to string for Supabase auth UUID
  email: string;
  nombre: string;
  rolId: number;
  avatarUrl?: string;
}

export type Sexo = 'Masculino' | 'Femenino';
export type EstadoAdolescente = 'Activo' | 'Inactivo' | 'Anulado';

export interface Adolescente {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  fechaNacimiento: string; // YYYY-MM-DD
  barrio: string;
  ciudad: string;
  telefono: string;
  sexo: Sexo;
  estado: EstadoAdolescente;
}

export interface Encargado {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  fechaNacimiento?: string; // YYYY-MM-DD
  barrio: string;
  ciudad: string;
  telefono: string;
  email?: string;
}

export type EstadoReunion = 'En Proceso' | 'Finalizado';

export interface Reunion {
  id: number;
  fecha: string; // YYYY-MM-DD
  tema: string;
  encargadoId: number;
  estado: EstadoReunion;
}

export type TipoAsistencia = 'Presente' | 'Ausente';
export type AsistenciaDetalle = 'Regular' | 'Primera Vez' | 'Regresa';

export interface Asistencia {
  reunionId: number;
  adolescenteId: number;
  estado: TipoAsistencia;
  detalle?: AsistenciaDetalle;
}

export type GradoParentesco = 'Padre' | 'Madre' | 'Tío' | 'Tía' | 'Abuelo' | 'Abuela' | 'Tutor Legal';

export interface Tutor {
    id: number;
    nombre: string;
    apellido: string;
    cedula: string;
    parentesco: GradoParentesco;
    barrio: string;
    ciudad: string;
}

export interface TutorAdolescente {
    tutorId: number;
    adolescenteId: number;
}


export interface Evento {
  id: number;
  tema: string;
  lugar: string;
  fechaInicio: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  fechaFin: string; // YYYY-MM-DD
  horaFin: string; // HH:MM
  tieneCosto: boolean;
  costoTotal?: number;
  costoPersona?: number;
}

export interface InscripcionEvento {
  id: number;
  eventoId: number;
  adolescenteId: number;
  fechaInscripcion: string; // YYYY-MM-DD
  notas?: string;
}

export interface PagoEvento {
  id: number;
  inscripcionId: number;
  fecha: string; // YYYY-MM-DD
  monto: number;
}

export interface ParticipanteEvento {
  eventoId: number;
  adolescenteId: number;
}

export interface CelebracionCumpleanos {
  adolescenteId: number;
  ano: number;
}

export type Page = 'dashboard' | 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos' | 'reportes' | 'usuarios' | 'roles' | 'asistencia' | 'limpiar-tablas' | 'cargar-tablas' | 'update-password';
