
import { supabase, supabaseUrl, supabaseKey } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { 
  Usuario, Rol, Adolescente, Encargado, Reunion, Tutor, Evento, Asistencia, 
  TutorAdolescente, InscripcionEvento, PagoEvento, ParticipanteEvento, TipoAsistencia, AsistenciaDetalle,
  CelebracionCumpleanos, ResumenReunion, Devocional, EntregaDevocional
} from '../types';

// Helper para normalizar la estructura de permisos de un rol (evita errores si faltan claves nuevas)
const normalizeRol = (rol: any): Rol => {
  const defaultPerms = { read: false, create: false, update: false, delete: false };
  return {
    ...rol,
    permisos: {
      adolescentes: rol.permisos?.adolescentes || { ...defaultPerms },
      encargados: rol.permisos?.encargados || { ...defaultPerms },
      reuniones: rol.permisos?.reuniones || { ...defaultPerms },
      tutores: rol.permisos?.tutores || { ...defaultPerms },
      eventos: rol.permisos?.eventos || { ...defaultPerms },
      usuarios: rol.permisos?.usuarios || { ...defaultPerms },
      devocionales: rol.permisos?.devocionales || rol.permisos?.tareas || { ...defaultPerms },
      entregas: rol.permisos?.entregas || rol.permisos?.tareas || { ...defaultPerms },
      inscripciones: rol.permisos?.inscripciones || { ...defaultPerms },
      pagos: rol.permisos?.pagos || { ...defaultPerms },
      participantes: rol.permisos?.participantes || { ...defaultPerms },
    }
  };
};

// Helper para manejar respuestas de Supabase y lanzar errores limpios
const handleSupabaseData = <T>(data: T | null, error: any, context: string): T => {
    if (error) {
        const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error(`Error en ${context}: ${errorMsg}`);
        throw new Error(errorMsg);
    }
    return data as T;
};

// Helper genérico para traer todas las filas con paginación
const fetchAllRows = async (
    table: string, 
    select: string, 
    orderBy?: { column: string, ascending: boolean }
) => {
    let allData: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
        let query = supabase.from(table).select(select).range(page * pageSize, (page + 1) * pageSize - 1);
        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending });
        }
        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < pageSize) hasMore = false;
        } else {
            hasMore = false;
        }
        page++;
    }
    return allData;
};

const MAX_ROWS = 10000;

export const api = {
  // --- Autenticación y Perfil de Usuario ---
  getUsuarioById: async (id: string): Promise<Usuario | null> => {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single();
    if (error) return null;
    return {
        ...data,
        rolId: data.rol_id,
        lastSignInAt: data.last_sign_in_at,
    };
  },
  
  getRolById: async (id: number): Promise<Rol | null> => {
    const { data, error } = await supabase.from('roles').select('*').eq('id', id).single();
    if (error) return null;
    return normalizeRol(data);
  },

  countUsuarios: async (): Promise<number> => {
    try {
      const { count, error } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count || 0;
    } catch (e) {
      return 0;
    }
  },

  ensureDefaultRoles: async (): Promise<void> => {
    const { data: existingRoles } = await supabase.from('roles').select('id');
    if (existingRoles && existingRoles.length > 0) return;

    const defaultPerms = { read: true, create: true, update: true, delete: true };
    const guestPerms = { read: true, create: false, update: false, delete: false };

    const roles = [
      {
        id: 1,
        nombre: 'Administrador',
        permisos: {
          adolescentes: defaultPerms,
          encargados: defaultPerms,
          reuniones: defaultPerms,
          tutores: defaultPerms,
          eventos: defaultPerms,
          usuarios: defaultPerms,
          devocionales: defaultPerms,
          entregas: defaultPerms,
          inscripciones: defaultPerms,
          pagos: defaultPerms,
          participantes: defaultPerms
        }
      },
      {
        id: 2,
        nombre: 'Encargado',
        permisos: {
          adolescentes: defaultPerms,
          encargados: guestPerms,
          reuniones: defaultPerms,
          tutores: defaultPerms,
          eventos: guestPerms,
          usuarios: guestPerms,
          devocionales: guestPerms,
          entregas: defaultPerms,
          inscripciones: defaultPerms,
          pagos: defaultPerms,
          participantes: defaultPerms
        }
      }
    ];

    await supabase.from('roles').insert(roles);
  },
  
  updateLastSignIn: async (id: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('usuarios')
            .update({ last_sign_in_at: new Date().toISOString() })
            .eq('id', id);
            
        if (error) {
            console.error("Error al actualizar última conexión:", error.message);
        }
    } catch (e) {
        console.error("Error crítico en updateLastSignIn:", e);
    }
  },

  resetPasswordForEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw new Error(error.message);
  },
  
  updateCurrentUserPassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  // --- Getters de Datos ---
  getAdolescentes: async (): Promise<Adolescente[]> => {
    try {
        const data = await fetchAllRows(
            'adolescentes', 
            'id, nombre, apellido, cedula, registro, fecha_nacimiento, barrio, ciudad, telefono, sexo, estado',
            { column: 'nombre', ascending: true }
        );
        return data.map((a: any) => ({
            id: a.id,
            nombre: a.nombre,
            apellido: a.apellido,
            cedula: a.cedula,
            registro: a.registro || '',
            fechaNacimiento: a.fecha_nacimiento,
            barrio: a.barrio,
            ciudad: a.ciudad,
            telefono: a.telefono,
            sexo: a.sexo,
            estado: a.estado
        }));
    } catch (error) {
        handleSupabaseData(null, error, 'getAdolescentes');
        return [];
    }
  },

  getEncargados: async (): Promise<Encargado[]> => {
    try {
        const data = await fetchAllRows(
            'encargados',
            'id, nombre, apellido, cedula, fecha_nacimiento, barrio, ciudad, telefono, email',
            { column: 'nombre', ascending: true }
        );
        return data.map((e: any) => ({
            id: e.id,
            nombre: e.nombre,
            apellido: e.apellido,
            cedula: e.cedula,
            fechaNacimiento: e.fecha_nacimiento,
            barrio: e.barrio,
            ciudad: e.ciudad,
            telefono: e.telefono,
            email: e.email
        }));
    } catch (error) {
        handleSupabaseData(null, error, 'getEncargados');
        return [];
    }
  },

  getReuniones: async (): Promise<Reunion[]> => {
    try {
        const data = await fetchAllRows(
            'reuniones',
            'id, fecha, tema, encargado_id, estado',
            { column: 'fecha', ascending: false }
        );
        return data.map((r: any) => ({
            id: r.id,
            fecha: r.fecha,
            tema: r.tema,
            encargadoId: r.encargado_id,
            estado: r.estado || 'En Proceso'
        }));
    } catch (error) {
        handleSupabaseData(null, error, 'getReuniones');
        return [];
    }
  },

  getTutores: async (): Promise<Tutor[]> => {
    try {
        const data = await fetchAllRows('tutores', '*', { column: 'nombre', ascending: true });
        return data as Tutor[];
    } catch (error) {
        handleSupabaseData(null, error, 'getTutores');
        return [];
    }
  },

  getEventos: async (): Promise<Evento[]> => {
    try {
        const data = await fetchAllRows('eventos', '*', { column: 'fecha_inicio', ascending: false });
        return data.map((e: any) => ({
            id: e.id,
            tema: e.tema,
            lugar: e.lugar,
            fechaInicio: e.fecha_inicio || e.fechaInicio,
            horaInicio: e.hora_inicio || e.horaInicio,
            fechaFin: e.fecha_fin || e.fechaFin,
            horaFin: e.hora_fin || e.horaFin,
            tieneCosto: e.tiene_costo || e.tieneCosto,
            costoTotal: e.costo_total || e.costoTotal,
            costoPersona: e.costo_persona || e.costoPersona
        }));
    } catch (error) {
        handleSupabaseData(null, error, 'getEventos');
        return [];
    }
  },

  getAsistencias: async (): Promise<Asistencia[]> => {
    try {
        const data = await fetchAllRows('asistencias', 'reunion_id, adolescente_id, estado, detalle');
        return data.map((a: any) => ({
            reunionId: a.reunion_id,
            adolescenteId: a.adolescente_id,
            estado: a.estado,
            detalle: a.detalle
        }));
    } catch (error) {
         handleSupabaseData(null, error, 'getAsistencias'); 
         return [];
    }
  },

  getAsistenciasByReunion: async (reunionId: number): Promise<Asistencia[]> => {
    const { data, error } = await supabase
       .from('asistencias')
       .select('reunion_id, adolescente_id, estado, detalle')
       .eq('reunion_id', reunionId);
    const result = handleSupabaseData(data, error, 'getAsistenciasByReunion');
    return (result || []).map((a: any) => ({
       reunionId: a.reunion_id,
       adolescenteId: a.adolescente_id,
       estado: a.estado,
       detalle: a.detalle
   }));
  },

  getResumenReuniones: async (): Promise<ResumenReunion[]> => {
    const { data, error } = await supabase.from('view_resumen_asistencia').select('*');
    if (error) return [];
    return (data || []).map((r: any) => ({
        reunionId: r.reunion_id,
        presentes: r.presentes || 0,
        ausentes: r.ausentes || 0
    }));
  },

  getTutorAdolescente: async (): Promise<TutorAdolescente[]> => {
    const { data, error } = await supabase.from('tutor_adolescente').select('*').range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getTutorAdolescente');
    return (result || []).map((ta: any) => ({
        tutorId: ta.tutor_id ?? ta.tutorId,
        adolescenteId: ta.adolescente_id ?? ta.adolescenteId
    }));
  },

  getInscripciones: async (): Promise<InscripcionEvento[]> => {
    const { data, error } = await supabase.from('inscripciones_eventos').select('*').range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getInscripciones');
    return (result || []).map((i: any) => ({
        id: i.id,
        eventoId: i.evento_id ?? i.eventoId,
        adolescenteId: i.adolescente_id ?? i.adolescenteId,
        fechaInscripcion: i.fecha_inscripcion ?? i.fechaInscripcion,
        notas: i.notas
    }));
  },

  getPagos: async (): Promise<PagoEvento[]> => {
    const { data, error } = await supabase.from('pagos_eventos').select('*').range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getPagos');
    return (result || []).map((p: any) => ({
        id: p.id,
        inscripcionId: p.inscripcion_id ?? p.inscripcionId,
        fecha: p.fecha,
        monto: p.monto
    }));
  },

  getParticipantes: async (): Promise<ParticipanteEvento[]> => {
    const { data, error } = await supabase.from('participantes_eventos').select('*').range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getParticipantes');
    return (result || []).map((p: any) => ({
        eventoId: p.evento_id ?? p.eventoId,
        adolescenteId: p.adolescente_id ?? p.adolescenteId
    }));
  },

  getUsuarios: async (): Promise<Usuario[]> => {
    const { data, error } = await supabase.from('usuarios').select('*');
    const result = handleSupabaseData(data, error, 'getUsuarios');
    return (result || []).map((u: any) => ({
        ...u,
        rolId: u.rol_id ?? u.rolId,
        avatarUrl: u.avatar_url ?? u.avatarUrl,
        lastSignInAt: u.last_sign_in_at
    }));
  },

  getRoles: async (): Promise<Rol[]> => {
    const { data, error } = await supabase.from('roles').select('*').order('id', { ascending: true });
    const result = handleSupabaseData(data, error, 'getRoles');
    return (result || []).map(normalizeRol);
  },

  getCumpleanosCelebrados: async (): Promise<CelebracionCumpleanos[]> => {
    const { data, error } = await supabase.from('celebraciones_cumpleanos').select('adolescente_id, ano').range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getCumpleanosCelebrados');
    return (result || []).map((c: any) => ({
        adolescenteId: c.adolescente_id ?? c.adolescenteId,
        ano: c.ano
    }));
  },

  // --- Tareas / Devocionales ---
  
  getDevocionales: async (): Promise<Devocional[]> => {
    try {
        const { data, error } = await supabase.from('devocionales').select('*').order('numero_semana', { ascending: false });
        if (error && error.code === '42P01') return [];
        const result = handleSupabaseData(data, error, 'getDevocionales');
        return (result || []).map((d: any) => ({
            id: d.id,
            numeroSemana: d.numero_semana,
            tema: d.tema,
            fechaDistribucion: d.fecha_distribucion,
            fechaVencimiento: d.fecha_vencimiento
        }));
    } catch (e) {
        return [];
    }
  },

  getEntregasDevocionales: async (): Promise<EntregaDevocional[]> => {
    try {
        const data = await fetchAllRows('entregas_devocionales', '*');
        return data.map((e: any) => ({
            id: e.id,
            devocionalId: e.devocional_id,
            adolescenteId: e.adolescente_id,
            fechaEntrega: e.fecha_entrega,
            observaciones: e.observaciones
        }));
    } catch (e) {
        return [];
    }
  },

  createDevocional: async (d: Omit<Devocional, 'id'>): Promise<Devocional> => {
    const dbPayload = {
        numero_semana: d.numeroSemana,
        tema: d.tema,
        fecha_distribucion: d.fechaDistribucion,
        fecha_vencimiento: d.fechaVencimiento
    };
    const { data, error } = await supabase.from('devocionales').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createDevocional');
    return {
        id: result.id,
        numeroSemana: result.numero_semana,
        tema: result.tema,
        fechaDistribucion: result.fecha_distribucion,
        fechaVencimiento: result.fecha_vencimiento
    };
  },

  updateDevocional: async (d: Devocional): Promise<Devocional> => {
    const dbPayload = {
        numero_semana: d.numeroSemana,
        tema: d.tema,
        fecha_distribucion: d.fechaDistribucion,
        fecha_vencimiento: d.fechaVencimiento
    };
    const { data, error } = await supabase.from('devocionales').update(dbPayload).eq('id', d.id).select().single();
    const result = handleSupabaseData(data, error, 'updateDevocional');
    return {
        id: result.id,
        numeroSemana: result.numero_semana,
        tema: result.tema,
        fechaDistribucion: result.fecha_distribucion,
        fechaVencimiento: result.fecha_vencimiento
    };
  },

  deleteDevocional: async (id: number): Promise<void> => {
    const { error } = await supabase.from('devocionales').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  
  registrarEntregasBulk: async (entregas: Omit<EntregaDevocional, 'id'>[]): Promise<void> => {
      const dbPayload = entregas.map(e => ({
        devocional_id: e.devocionalId,
        adolescente_id: e.adolescenteId,
        fecha_entrega: e.fechaEntrega,
        observaciones: e.observaciones
      }));
      const { error } = await supabase.from('entregas_devocionales').insert(dbPayload);
      if (error) throw new Error(error.message);
  },

  deleteEntrega: async (id: number): Promise<void> => {
    const { error } = await supabase.from('entregas_devocionales').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  
  updateEntregaDevocional: async (entrega: EntregaDevocional): Promise<void> => {
    const dbPayload = {
        devocional_id: entrega.devocionalId,
        adolescente_id: entrega.adolescenteId,
        fecha_entrega: entrega.fechaEntrega,
        observaciones: entrega.observaciones
    };
    const { error } = await supabase.from('entregas_devocionales').update(dbPayload).eq('id', entrega.id);
    if (error) throw new Error(error.message);
  },

  // --- Operaciones CRUD ---

  createAdolescente: async (adolescente: Omit<Adolescente, 'id'>): Promise<Adolescente> => {
    const dbPayload = {
        nombre: adolescente.nombre,
        apellido: adolescente.apellido,
        cedula: adolescente.cedula,
        registro: adolescente.registro,
        fecha_nacimiento: adolescente.fechaNacimiento,
        barrio: adolescente.barrio,
        ciudad: adolescente.ciudad,
        telefono: adolescente.telefono,
        sexo: adolescente.sexo,
        estado: adolescente.estado
    };
    const { data, error } = await supabase.from('adolescentes').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createAdolescente');
    return { 
        id: result.id,
        nombre: result.nombre,
        apellido: result.apellido,
        cedula: result.cedula,
        registro: result.registro,
        fechaNacimiento: result.fecha_nacimiento,
        barrio: result.barrio,
        ciudad: result.ciudad,
        telefono: result.telefono,
        sexo: result.sexo,
        estado: result.estado
    };
  },

  updateAdolescente: async (adolescente: Adolescente): Promise<Adolescente> => {
    const dbPayload = {
        nombre: adolescente.nombre,
        apellido: adolescente.apellido,
        cedula: adolescente.cedula,
        registro: adolescente.registro,
        fecha_nacimiento: adolescente.fechaNacimiento,
        barrio: adolescente.barrio,
        ciudad: adolescente.ciudad,
        telefono: adolescente.telefono,
        sexo: adolescente.sexo,
        estado: adolescente.estado
    };
    const { data, error } = await supabase.from('adolescentes').update(dbPayload).eq('id', adolescente.id).select().single();
    const result = handleSupabaseData(data, error, 'updateAdolescente');
    return { 
        id: result.id,
        nombre: result.nombre,
        apellido: result.apellido,
        cedula: result.cedula,
        registro: result.registro,
        fechaNacimiento: result.fecha_nacimiento,
        barrio: result.barrio,
        ciudad: result.ciudad,
        telefono: result.telefono,
        sexo: result.sexo,
        estado: result.estado
    };
  },

  deleteAdolescente: async (id: number): Promise<void> => {
    const { error } = await supabase.from('adolescentes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  createAdolescentesBulk: async (adolescentes: Omit<Adolescente, 'id'>[]): Promise<void> => {
    const dbPayload = adolescentes.map(a => ({
        nombre: a.nombre,
        apellido: a.apellido,
        cedula: a.cedula,
        registro: a.registro,
        fecha_nacimiento: a.fechaNacimiento,
        barrio: a.barrio,
        ciudad: a.ciudad,
        telefono: a.telefono,
        sexo: a.sexo,
        estado: a.estado
    }));
    const { error } = await supabase.from('adolescentes').insert(dbPayload);
    if (error) throw new Error(error.message);
  },

  createEncargado: async (encargado: Omit<Encargado, 'id'>): Promise<Encargado> => {
    const dbPayload = {
        nombre: encargado.nombre,
        apellido: encargado.apellido,
        cedula: encargado.cedula,
        fecha_nacimiento: encargado.fechaNacimiento || null,
        barrio: encargado.barrio,
        ciudad: encargado.ciudad,
        telefono: encargado.telefono,
        email: encargado.email || null
    };
    const { data, error } = await supabase.from('encargados').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createEncargado');
    return { 
        id: result.id,
        nombre: result.nombre,
        apellido: result.apellido,
        cedula: result.cedula,
        fechaNacimiento: result.fecha_nacimiento,
        barrio: result.barrio,
        ciudad: result.ciudad,
        telefono: result.telefono,
        email: result.email
    };
  },

  updateEncargado: async (encargado: Encargado): Promise<Encargado> => {
    const dbPayload = {
        nombre: encargado.nombre,
        apellido: encargado.apellido,
        cedula: encargado.cedula,
        fecha_nacimiento: encargado.fechaNacimiento || null,
        barrio: encargado.barrio,
        ciudad: encargado.ciudad,
        telefono: encargado.telefono,
        email: encargado.email || null
    };
    const { data, error } = await supabase.from('encargados').update(dbPayload).eq('id', encargado.id).select().single();
    const result = handleSupabaseData(data, error, 'updateEncargado');
    return { 
        id: result.id,
        nombre: result.nombre,
        apellido: result.apellido,
        cedula: result.cedula,
        fechaNacimiento: result.fecha_nacimiento,
        barrio: result.barrio,
        ciudad: result.ciudad,
        telefono: result.telefono,
        email: result.email
    };
  },

  deleteEncargado: async (id: number): Promise<void> => {
    const { error } = await supabase.from('encargados').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  createEncargadosBulk: async (encargados: Omit<Encargado, 'id'>[]): Promise<void> => {
     const dbPayload = encargados.map(e => ({
        nombre: e.nombre,
        apellido: e.apellido,
        cedula: e.cedula,
        fecha_nacimiento: e.fechaNacimiento || null,
        barrio: e.barrio,
        ciudad: e.ciudad,
        telefono: e.telefono,
        email: e.email || null
    }));
    const { error } = await supabase.from('encargados').insert(dbPayload);
    if (error) throw new Error(error.message);
  },

  createReunion: async (reunion: Omit<Reunion, 'id'>): Promise<Reunion> => {
    const dbPayload = {
        fecha: reunion.fecha,
        tema: reunion.tema,
        encargado_id: reunion.encargadoId,
        estado: reunion.estado
    };
    const { data, error } = await supabase.from('reuniones').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createReunion');
    return { 
        id: result.id,
        fecha: result.fecha,
        tema: result.tema,
        encargadoId: result.encargado_id,
        estado: result.estado
    };
  },

  updateReunion: async (reunion: Reunion): Promise<Reunion> => {
    const dbPayload = {
        fecha: reunion.fecha,
        tema: reunion.tema,
        encargado_id: reunion.encargadoId,
        estado: reunion.estado
    };
    const { data, error } = await supabase.from('reuniones').update(dbPayload).eq('id', reunion.id).select().single();
    const result = handleSupabaseData(data, error, 'updateReunion');
    return { 
        id: result.id,
        fecha: result.fecha,
        tema: result.tema,
        encargadoId: result.encargado_id,
        estado: result.estado
    };
  },

  deleteReunion: async (id: number): Promise<void> => {
    const { error } = await supabase.from('reuniones').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  createReunionesBulk: async (reuniones: (Omit<Reunion, 'id' | 'encargadoId'> & { encargadoCedula: string })[]): Promise<void> => {
    const { data: encargados } = await supabase.from('encargados').select('id, cedula');
    if (!encargados) throw new Error("No se pudieron cargar encargados para validación");
    const dbPayload = reuniones.map(r => {
        const encargado = encargados.find((e: any) => e.cedula === r.encargadoCedula);
        if (!encargado) return null;
        return { fecha: r.fecha, tema: r.tema, estado: r.estado, encargado_id: encargado.id };
    }).filter(Boolean);
    if (dbPayload.length > 0) {
        const { error } = await supabase.from('reuniones').insert(dbPayload);
        if (error) throw new Error(error.message);
    }
  },

  saveAsistencias: async (nuevasAsistencias: Asistencia[]): Promise<void> => {
    const dbPayload = nuevasAsistencias.map(a => ({
        reunion_id: a.reunionId,
        adolescente_id: a.adolescenteId,
        estado: a.estado,
        detalle: a.detalle || null
    }));
    const { error } = await supabase.from('asistencias').upsert(dbPayload, { onConflict: 'reunion_id,adolescente_id' });
    if (error) throw new Error(error.message);
  },

  createTutor: async (tutor: Omit<Tutor, 'id'>): Promise<Tutor> => {
    const dbPayload = { 
        nombre: tutor.nombre, 
        apellido: tutor.apellido, 
        cedula: tutor.cedula, 
        telefono: tutor.telefono, 
        parentesco: tutor.parentesco, 
        barrio: tutor.barrio, 
        ciudad: tutor.ciudad 
    };
    const { data, error } = await supabase.from('tutores').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createTutor');
    return result;
  },

  updateTutor: async (tutor: Tutor): Promise<Tutor> => {
    const dbPayload = { 
        nombre: tutor.nombre, 
        apellido: tutor.apellido, 
        cedula: tutor.cedula, 
        telefono: tutor.telefono, 
        parentesco: tutor.parentesco, 
        barrio: tutor.barrio, 
        ciudad: tutor.ciudad 
    };
    const { data, error } = await supabase.from('tutores').update(dbPayload).eq('id', tutor.id).select().single();
    const result = handleSupabaseData(data, error, 'updateTutor');
    return result;
  },

  deleteTutor: async (id: number): Promise<void> => {
    const { error: linkError } = await supabase.from('tutor_adolescente').delete().eq('tutor_id', id);
    if (linkError) throw new Error(linkError.message);

    const { error } = await supabase.from('tutores').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  setTutorAdolescenteLinks: async (tutorId: number, adolescenteIds: number[]): Promise<void> => {
    await supabase.from('tutor_adolescente').delete().eq('tutor_id', tutorId);
    if (adolescenteIds.length > 0) {
        const payload = adolescenteIds.map(id => ({ tutor_id: tutorId, adolescente_id: id }));
        await supabase.from('tutor_adolescente').insert(payload);
    }
  },

  createTutoresAndLinkBulk: async (tutores: (Omit<Tutor, 'id'> & { adolescenteCedulas: string })[]): Promise<void> => {
    const tutoresPayload = tutores.map(t => ({ 
        nombre: t.nombre, 
        apellido: t.apellido, 
        cedula: t.cedula, 
        telefono: t.telefono, 
        parentesco: t.parentesco, 
        barrio: t.barrio, 
        ciudad: t.ciudad 
    }));
    const { data: createdTutores, error: tutorError } = await supabase.from('tutores').insert(tutoresPayload).select();
    if (tutorError) throw new Error(tutorError.message);
    const { data: adolescentes } = await supabase.from('adolescentes').select('id, cedula');
    if (!adolescentes || !createdTutores) return;
    const linksPayload: any[] = [];
    createdTutores.forEach((newTutor: any) => {
        const originalInput = tutores.find(t => t.cedula === newTutor.cedula);
        if (originalInput && originalInput.adolescenteCedulas) {
            const cedulas = originalInput.adolescenteCedulas.split(',').map(c => c.trim());
            cedulas.forEach(c => {
                const ado = adolescentes.find((a: any) => a.cedula === c);
                if (ado) linksPayload.push({ tutor_id: newTutor.id, adolescente_id: ado.id });
            });
        }
    });
    if (linksPayload.length > 0) await supabase.from('tutor_adolescente').insert(linksPayload);
  },
  
  createUsuario: async (usuario: Omit<Usuario, 'id' | 'password'> & { id?: string, password?: string }): Promise<Usuario> => {
    if (!usuario.password) throw new Error("Se requiere una contraseña.");
    
    const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });

    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: usuario.email,
        password: usuario.password,
        options: { data: { nombre: usuario.nombre, rol_id: usuario.rolId } }
    });
    if (authError) throw new Error(`Auth: ${authError.message}`);
    const userId = authData.user?.id;
    if (!userId) throw new Error("No se pudo obtener el ID del usuario.");
    const dbPayload = { id: userId, nombre: usuario.nombre, email: usuario.email, rol_id: usuario.rolId };
    const { data, error } = await supabase.from('usuarios').upsert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createUsuario');
    return { ...result, rolId: result.rol_id, lastSignInAt: result.last_sign_in_at };
  },

  updateUsuario: async (usuario: Usuario): Promise<Usuario> => {
    const dbPayload = { nombre: usuario.nombre, email: usuario.email, rol_id: usuario.rolId };
    const { data, error } = await supabase.from('usuarios').update(dbPayload).eq('id', usuario.id).select().single();
    const result = handleSupabaseData(data, error, 'updateUsuario');
    return { ...result, rolId: result.rol_id, lastSignInAt: result.last_sign_in_at };
  },

  deleteUsuario: async (id: string): Promise<void> => {
    const { error: rpcError } = await supabase.rpc('delete_user', { user_id: id });
    
    if (!rpcError) return; 

    if (rpcError.code === '42883' || rpcError.message.includes('function') || rpcError.message.includes('does not exist')) {
         const { error: dbError } = await supabase.from('usuarios').delete().eq('id', id);
         if (dbError) throw new Error(dbError.message);
    } else {
        throw new Error(rpcError.message);
    }
  },

  createRole: async (role: Omit<Rol, 'id'>): Promise<Rol> => {
    const { data, error } = await supabase.from('roles').insert(role).select().single();
    return normalizeRol(handleSupabaseData(data, error, 'createRole'));
  },

  updateRole: async (role: Rol): Promise<Rol> => {
    const { data, error } = await supabase.from('roles').update(role).eq('id', role.id).select().single();
    return normalizeRol(handleSupabaseData(data, error, 'updateRole'));
  },

  deleteRole: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) {
        if (error.code === '23503') return { success: false, message: 'El rol está en uso.' };
        throw new Error(error.message);
    }
    return { success: true };
  },

  createEvento: async (evento: Omit<Evento, 'id'>): Promise<Evento> => {
    const dbPayload = { tema: evento.tema, lugar: evento.lugar, fecha_inicio: evento.fechaInicio, hora_inicio: evento.horaInicio, fecha_fin: evento.fechaFin, hora_fin: evento.horaFin, tiene_costo: evento.tieneCosto, costo_total: evento.costoTotal || null, costo_persona: evento.costoPersona || null };
    const { data, error } = await supabase.from('eventos').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createEvento') as any; 
    return { id: result.id, tema: result.tema, lugar: result.lugar, fechaInicio: result.fecha_inicio, horaInicio: result.hora_inicio, fechaFin: result.fecha_fin, horaFin: result.hora_fin, tieneCosto: result.tiene_costo, costoTotal: result.costo_total, costoPersona: result.costo_persona };
  },

  updateEvento: async (evento: Evento): Promise<Evento> => {
    const dbPayload = { tema: evento.tema, lugar: evento.lugar, fecha_inicio: evento.fechaInicio, hora_inicio: evento.horaInicio, fecha_fin: evento.fechaFin, hora_fin: evento.horaFin, tiene_costo: evento.tieneCosto, costo_total: evento.costoTotal || null, costo_persona: evento.costoPersona || null };
    const { data, error } = await supabase.from('eventos').update(dbPayload).eq('id', evento.id).select().single();
    const result = handleSupabaseData(data, error, 'updateEvento') as any; 
    return { id: result.id, tema: result.tema, lugar: result.lugar, fechaInicio: result.fecha_inicio, horaInicio: result.hora_inicio, fechaFin: result.fecha_fin, horaFin: result.hora_fin, tieneCosto: result.tiene_costo, costoTotal: result.costo_total, costoPersona: result.costo_persona };
  },

  deleteEvento: async (id: number): Promise<void> => {
    await supabase.from('eventos').delete().eq('id', id);
  },

  createPago: async (pago: Omit<PagoEvento, 'id'>): Promise<PagoEvento> => {
    const dbPayload = { inscripcion_id: pago.inscripcionId, monto: pago.monto, fecha: pago.fecha };
    const { data, error } = await supabase.from('pagos_eventos').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createPago');
    return { id: result.id, inscripcionId: result.inscripcion_id, fecha: result.fecha, monto: result.monto };
  },

  deletePago: async (id: number): Promise<void> => {
    await supabase.from('pagos_eventos').delete().eq('id', id);
  },

  createInscripcion: async (inscripcion: Omit<InscripcionEvento, 'id'>): Promise<InscripcionEvento> => {
    const dbPayload = { evento_id: inscripcion.eventoId, adolescente_id: inscripcion.adolescenteId, fecha_inscripcion: inscripcion.fechaInscripcion, notas: inscripcion.notas };
    const { data, error } = await supabase.from('inscripciones_eventos').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createInscripcion');
    return { id: result.id, eventoId: result.evento_id, adolescenteId: result.adolescenteId, fechaInscripcion: result.fecha_inscripcion, notas: result.notas };
  },

  updateInscripcion: async (inscripcion: InscripcionEvento): Promise<InscripcionEvento> => {
    const dbPayload = { evento_id: inscripcion.eventoId, adolescente_id: inscripcion.adolescenteId, fecha_inscripcion: inscripcion.fechaInscripcion, notas: inscripcion.notas };
    const { data, error } = await supabase.from('inscripciones_eventos').update(dbPayload).eq('id', inscripcion.id).select().single();
    const result = handleSupabaseData(data, error, 'updateInscripcion');
    return { id: result.id, eventoId: result.evento_id, adolescenteId: result.adolescenteId, fechaInscripcion: result.fecha_inscripcion, notas: result.notas };
  },

  deleteInscripcion: async (id: number): Promise<void> => {
    await supabase.from('inscripciones_eventos').delete().eq('id', id);
  },

  addParticipante: async (p: ParticipanteEvento): Promise<ParticipanteEvento> => {
    const { data, error } = await supabase.from('participantes_eventos').insert({ evento_id: p.eventoId, adolescente_id: p.adolescenteId }).select().single();
    const r = handleSupabaseData(data, error, 'addParticipante');
    return { eventoId: r.evento_id, adolescenteId: r.adolescente_id };
  },

  removeParticipante: async (eId: number, aId: number): Promise<void> => {
    await supabase.from('participantes_eventos').delete().eq('evento_id', eId).eq('adolescente_id', aId);
  },
  
  addCumpleanosCelebrado: async (c: CelebracionCumpleanos): Promise<CelebracionCumpleanos> => {
    const { data, error } = await supabase.from('celebraciones_cumpleanos').upsert({ adolescente_id: c.adolescenteId, ano: c.ano }, { onConflict: 'adolescente_id,ano' }).select().single();
    const r = handleSupabaseData(data, error, 'addCumpleanosCelebrado');
    return { adolescenteId: r.adolescente_id, ano: r.ano };
  },
  
  clearTable: async (table: 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos'): Promise<void> => {
    await supabase.from(table).delete().neq('id', 0);
  },

  createUserProfile: async (profile: Usuario): Promise<Usuario> => {
     return api.createUsuario(profile);
  },
};
