
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
    devocionales: Permisos;
    entregas: Permisos;
    inscripciones: Permisos;
    pagos: Permisos;
    participantes: Permisos;
  };
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rolId: number;
  avatarUrl?: string;
  lastSignInAt?: string;
}

export type Sexo = 'Masculino' | 'Femenino';
export type EstadoAdolescente = 'Activo' | 'Inactivo' | 'Anulado';

export interface Adolescente {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  registro: string;
  fechaNacimiento: string;
  barrio: string;
  ciudad: string;
  telefono: string;
  sexo: Sexo;
  estado: EstadoAdolescente;
  fichaInscripcion?: boolean;
  autorizacion?: boolean;
}

// --- SERVIDORES (APOYO) ---
export type RolServidor = 'Pastor' | 'Padre' | 'Madre' | 'Lider de Color' | 'Lider de Campamento' | 'Cuidador' | 'Apoyo' | 'Cocina' | 'Sonido' | 'Alabanza' | 'Otro';
export type TipoBeca = 'Ninguna' | 'Parcial' | 'Total';

export interface Servidor {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  registro: string;
  telefono: string;
  ciudad: string;
}

export interface InscripcionServidor {
  id: number;
  eventoId: number;
  servidorId: number;
  rol: RolServidor;
  tipoBeca?: TipoBeca;
  montoAcordado?: number;
  iglesiaPagaSaldo?: boolean;
  precioEspecialLocal?: boolean;
  notas?: string;
}

export interface PagoServidor {
  id: number;
  inscripcionServidorId: number;
  fecha: string;
  monto: number;
  notas?: string;
}

export interface Encargado {
  id: number;
  nombre: string;
  apellido: string;
  cedula: string;
  fechaNacimiento?: string;
  barrio: string;
  ciudad: string;
  telefono: string;
  email?: string;
}

export type EstadoReunion = 'En Proceso' | 'Finalizado';

export interface Reunion {
  id: number;
  fecha: string;
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

export interface ResumenReunion {
  reunionId: number;
  presentes: number;
  ausentes: number;
}

export type GradoParentesco = 'Padre' | 'Madre' | 'Tío' | 'Tía' | 'Abuelo' | 'Abuela' | 'Tutor Legal';

export interface Tutor {
    id: number;
    nombre: string;
    apellido: string;
    cedula: string;
    telefono: string;
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
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  tieneCosto: boolean;
  costoTotal?: number;
  costoPersona?: number;
  esParaPadres?: boolean;
  finalizado?: boolean;
}

export interface InscripcionEvento {
  id: number;
  eventoId: number;
  adolescenteId?: number;
  tutorId?: number;
  fechaInscripcion: string;
  notas?: string;
  asistio?: boolean;
}

export interface PagoEvento {
  id: number;
  inscripcionId: number;
  fecha: string;
  monto: number;
  notas?: string;
}

export interface ParticipanteEvento {
  eventoId: number;
  adolescenteId: number;
}

export interface CelebracionCumpleanos {
  adolescenteId: number;
  ano: number;
}

export interface Devocional {
  id: number;
  numeroSemana: number;
  tema: string;
  fechaDistribucion: string;
  fechaVencimiento: string;
}

export interface EntregaDevocional {
  id: number;
  devocionalId: number;
  adolescenteId: number;
  fechaEntrega: string;
  observaciones?: string;
}

export type Page = 'dashboard' | 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos' | 'reportes' | 'reportes-financieros' | 'usuarios' | 'roles' | 'asistencia' | 'limpiar-tablas' | 'cargar-tablas' | 'update-password' | 'tareas' | 'servidores';
