import { supabase, supabaseUrl, supabaseKey } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { 
  Usuario, Rol, Adolescente, Encargado, Reunion, Tutor, Evento, Asistencia, 
  TutorAdolescente, InscripcionEvento, PagoEvento, ParticipanteEvento, TipoAsistencia, AsistenciaDetalle,
  CelebracionCumpleanos, ResumenReunion, Devocional, EntregaDevocional
} from '../types';

// Configuración de Timeouts
const API_TIMEOUT = 15000; // 15 segundos máximo para no desesperar al usuario

const withTimeout = <T>(promise: Promise<T>, ms = API_TIMEOUT): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("La base de datos no responde. Verifique su señal.")), ms);
    promise
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
};

const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 800): Promise<T> => {
  try {
    return await withTimeout(fn());
  } catch (error: any) {
    const isRetryable = 
        error.message?.includes('fetch') || 
        error.message?.includes('NetworkError') || 
        error.message?.includes('Timeout') ||
        error.message?.includes('no responde') ||
        error.status === 504 || 
        error.status === 502 ||
        error.status === 408;

    if (retries > 0 && isRetryable) {
      console.warn(`Reintentando... (${retries} restantes). Motivo: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const normalizeRol = (rol: any): Rol => {
  const defaultPerms = { read: false, create: false, update: false, delete: false };
  if (!rol) {
      return {
          id: 0, nombre: 'Rol Inválido',
          permisos: {
            adolescentes: { ...defaultPerms }, encargados: { ...defaultPerms }, reuniones: { ...defaultPerms },
            tutores: { ...defaultPerms }, eventos: { ...defaultPerms }, usuarios: { ...defaultPerms },
            devocionales: { ...defaultPerms }, entregas: { ...defaultPerms }, inscripciones: { ...defaultPerms },
            pagos: { ...defaultPerms }, participantes: { ...defaultPerms },
          }
      };
  }
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

const handleSupabaseData = <T>(data: T | null, error: any, context: string): T => {
    if (error) {
        const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error(`Error en ${context}: ${errorMsg}`);
        throw new Error(errorMsg);
    }
    return data as T;
};

const fetchAllRows = async (table: string, select: string, orderBy?: { column: string, ascending: boolean }) => {
    return withRetry(async () => {
        let allData: any[] = [];
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;
        while (hasMore) {
            let query = supabase.from(table).select(select).range(page * pageSize, (page + 1) * pageSize - 1);
            if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending });
            const { data, error } = await query;
            if (error) throw error;
            if (data && data.length > 0) {
                allData = allData.concat(data);
                if (data.length < pageSize) hasMore = false;
            } else { hasMore = false; }
            page++;
        }
        return allData;
    });
};

const MAX_ROWS = 10000;

export const api = {
  getUsuarioById: async (id: string): Promise<Usuario | null> => {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single();
    if (error || !data) return null;
    return { ...data, rolId: data.rol_id, lastSignInAt: data.last_sign_in_at };
  },
  
  getRolById: async (id: number): Promise<Rol | null> => {
    const { data, error } = await supabase.from('roles').select('*').eq('id', id).single();
    if (error || !data) return null;
    return normalizeRol(data);
  },

  countUsuarios: async (): Promise<number> => {
    try {
      const { count, error } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
      if (error) return -1;
      return count ?? 0;
    } catch (e) { return -1; }
  },

  ensureDefaultRoles: async (): Promise<void> => {
    const { data: existingRoles } = await supabase.from('roles').select('id');
    if (existingRoles && existingRoles.length > 0) return;
    const defaultPerms = { read: true, create: true, update: true, delete: true };
    const guestPerms = { read: true, create: false, update: false, delete: false };
    const roles = [
      { id: 1, nombre: 'Administrador', permisos: { adolescentes: defaultPerms, encargados: defaultPerms, reuniones: defaultPerms, tutores: defaultPerms, eventos: defaultPerms, usuarios: defaultPerms, devocionales: defaultPerms, entregas: defaultPerms, inscripciones: defaultPerms, pagos: defaultPerms, participantes: defaultPerms } },
      { id: 2, nombre: 'Encargado', permisos: { adolescentes: defaultPerms, encargados: guestPerms, reuniones: defaultPerms, tutores: defaultPerms, eventos: guestPerms, usuarios: guestPerms, devocionales: guestPerms, entregas: defaultPerms, inscripciones: defaultPerms, pagos: defaultPerms, participantes: defaultPerms } }
    ];
    await supabase.from('roles').insert(roles);
  },
  
  updateLastSignIn: async (id: string): Promise<void> => {
    try { await supabase.from('usuarios').update({ last_sign_in_at: new Date().toISOString() }).eq('id', id); } catch (e) {}
  },

  resetPasswordForEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) throw new Error(error.message);
  },
  
  updateCurrentUserPassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  getAdolescentes: async (): Promise<Adolescente[]> => {
    try {
        const columns = 'id, nombre, apellido, cedula, registro, fecha_nacimiento, barrio, ciudad, telefono, sexo, estado';
        const data = await fetchAllRows('adolescentes', columns, { column: 'nombre', ascending: true });
        return data.map((a: any) => ({ id: a.id, nombre: a.nombre, apellido: a.apellido, cedula: a.cedula, registro: a.registro || '', fechaNacimiento: a.fecha_nacimiento, barrio: a.barrio || '', ciudad: a.ciudad || '', telefono: a.telefono || '', sexo: a.sexo, estado: a.estado }));
    } catch (error: any) { return []; }
  },

  getEncargados: async (): Promise<Encargado[]> => {
    try {
        const data = await fetchAllRows('encargados', 'id, nombre, apellido, cedula, fecha_nacimiento, barrio, ciudad, telefono, email', { column: 'nombre', ascending: true });
        return data.map((e: any) => ({ id: e.id, nombre: e.nombre, apellido: e.apellido, cedula: e.cedula, fechaNacimiento: e.fecha_nacimiento, barrio: e.barrio, ciudad: e.ciudad, telefono: e.telefono, email: e.email }));
    } catch (error) { return []; }
  },

  getReuniones: async (): Promise<Reunion[]> => {
    try {
        const data = await fetchAllRows('reuniones', 'id, fecha, tema, encargado_id, estado', { column: 'fecha', ascending: false });
        return data.map((r: any) => ({ id: r.id, fecha: r.fecha, tema: r.tema, encargadoId: r.encargado_id, estado: r.estado || 'En Proceso' }));
    } catch (error) { return []; }
  },

  getTutores: async (): Promise<Tutor[]> => {
    try {
        const data = await fetchAllRows('tutores', '*', { column: 'nombre', ascending: true });
        return data as Tutor[];
    } catch (error) { return []; }
  },

  getEventos: async (): Promise<Evento[]> => {
    try {
        const data = await fetchAllRows('eventos', '*', { column: 'fecha_inicio', ascending: false });
        return data.map((e: any) => ({ id: e.id, tema: e.tema, lugar: e.lugar, fechaInicio: e.fecha_inicio, horaInicio: e.hora_inicio, fechaFin: e.fecha_fin, horaFin: e.hora_fin, tieneCosto: e.tiene_costo, costoTotal: e.costo_total, costoPersona: e.costo_persona }));
    } catch (error) { return []; }
  },

  getAsistencias: async (): Promise<Asistencia[]> => {
    try {
        const data = await fetchAllRows('asistencias', 'reunion_id, adolescente_id, estado, detalle');
        return data.map((a: any) => ({ reunionId: a.reunion_id, adolescenteId: a.adolescente_id, estado: a.estado, detalle: a.detalle }));
    } catch (error) { return []; }
  },

  getAsistenciasByReunion: async (reunionId: number): Promise<Asistencia[]> => {
    const { data, error } = await supabase.from('asistencias').select('reunion_id, adolescente_id, estado, detalle').eq('reunion_id', reunionId);
    if (error) return [];
    return (data || []).map((a: any) => ({ reunionId: a.reunion_id, adolescenteId: a.adolescente_id, estado: a.estado, detalle: a.detalle }));
  },

  getResumenReuniones: async (): Promise<ResumenReunion[]> => {
    const { data, error } = await supabase.from('view_resumen_asistencia').select('*');
    if (error) return [];
    return (data || []).map((r: any) => ({ reunionId: r.reunion_id, presentes: r.presentes || 0, ausentes: r.ausentes || 0 }));
  },

  getTutorAdolescente: async (): Promise<TutorAdolescente[]> => {
    const { data, error } = await supabase.from('tutor_adolescente').select('*').range(0, MAX_ROWS);
    if (error) return [];
    return (data || []).map((ta: any) => ({ tutorId: ta.tutor_id ?? ta.tutorId, adolescenteId: ta.adolescente_id ?? ta.adolescenteId }));
  },

  getInscripciones: async (): Promise<InscripcionEvento[]> => {
    const { data, error } = await supabase.from('inscripciones_eventos').select('*').range(0, MAX_ROWS);
    if (error) return [];
    return (data || []).map((i: any) => ({ id: i.id, eventoId: i.evento_id, adolescenteId: i.adolescente_id, fechaInscripcion: i.fecha_inscripcion, notas: i.notas }));
  },

  getPagos: async (): Promise<PagoEvento[]> => {
    const { data, error } = await supabase.from('pagos_eventos').select('*').range(0, MAX_ROWS);
    if (error) return [];
    return (data || []).map((p: any) => ({ id: p.id, inscripcionId: p.inscripcion_id, fecha: p.fecha, monto: p.monto }));
  },

  getParticipantes: async (): Promise<ParticipanteEvento[]> => {
    const { data, error } = await supabase.from('participantes_eventos').select('*').range(0, MAX_ROWS);
    if (error) return [];
    return (data || []).map((p: any) => ({ eventoId: p.evento_id, adolescenteId: p.adolescente_id }));
  },

  getUsuarios: async (): Promise<Usuario[]> => {
    const { data, error } = await supabase.from('usuarios').select('*');
    if (error) return [];
    return (data || []).map((u: any) => ({ ...u, rolId: u.rol_id, avatarUrl: u.avatar_url, lastSignInAt: u.last_sign_in_at }));
  },

  getRoles: async (): Promise<Rol[]> => {
    const { data, error } = await supabase.from('roles').select('*').order('id', { ascending: true });
    if (error) return [];
    return (data || []).map(normalizeRol);
  },

  getCumpleanosCelebrados: async (): Promise<CelebracionCumpleanos[]> => {
    const { data, error } = await supabase.from('celebraciones_cumpleanos').select('adolescente_id, ano').range(0, MAX_ROWS);
    if (error) return [];
    return (data || []).map((c: any) => ({ adolescenteId: c.adolescente_id, ano: c.ano }));
  },
  
  getDevocionales: async (): Promise<Devocional[]> => {
    try {
        const { data, error } = await supabase.from('devocionales').select('*').order('numero_semana', { ascending: false });
        if (error) return [];
        return (data || []).map((d: any) => ({ id: d.id, numeroSemana: d.numero_semana, tema: d.tema, fechaDistribucion: d.fecha_distribucion, fechaVencimiento: d.fecha_vencimiento }));
    } catch (e) { return []; }
  },

  getEntregasDevocionales: async (): Promise<EntregaDevocional[]> => {
    try {
        const data = await fetchAllRows('entregas_devocionales', '*');
        return data.map((e: any) => ({ id: e.id, devocionalId: e.devocional_id, adolescenteId: e.adolescente_id, fechaEntrega: e.fecha_entrega, observaciones: e.observaciones }));
    } catch (e) { return []; }
  },

  createDevocional: async (d: Omit<Devocional, 'id'>): Promise<Devocional> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('devocionales').insert({ numero_semana: d.numeroSemana, tema: d.tema, fecha_distribucion: d.fechaDistribucion, fecha_vencimiento: d.fechaVencimiento }).select().single();
        const result = handleSupabaseData(data, error, 'createDevocional');
        return { id: result.id, numeroSemana: result.numero_semana, tema: result.tema, fechaDistribucion: result.fecha_distribucion, fechaVencimiento: result.fecha_vencimiento };
    });
  },

  updateDevocional: async (d: Devocional): Promise<Devocional> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('devocionales').update({ numero_semana: d.numeroSemana, tema: d.tema, fecha_distribucion: d.fechaDistribucion, fecha_vencimiento: d.fechaVencimiento }).eq('id', d.id).select().single();
        const result = handleSupabaseData(data, error, 'updateDevocional');
        return { id: result.id, numeroSemana: result.numero_semana, tema: result.tema, fechaDistribucion: result.fecha_distribucion, fechaVencimiento: result.fecha_vencimiento };
    });
  },

  deleteDevocional: async (id: number): Promise<void> => { await supabase.from('devocionales').delete().eq('id', id); },
  
  registrarEntregasBulk: async (entregas: Omit<EntregaDevocional, 'id'>[]): Promise<void> => {
    return withRetry(async () => {
        await supabase.from('entregas_devocionales').insert(entregas.map(e => ({ devocional_id: e.devocionalId, adolescente_id: e.adolescenteId, fecha_entrega: e.fechaEntrega, observaciones: e.observaciones })));
    });
  },

  deleteEntrega: async (id: number): Promise<void> => { await supabase.from('entregas_devocionales').delete().eq('id', id); },
  
  updateEntregaDevocional: async (entrega: EntregaDevocional): Promise<void> => {
    return withRetry(async () => {
        await supabase.from('entregas_devocionales').update({ devocional_id: entrega.devocionalId, adolescente_id: entrega.adolescenteId, fecha_entrega: entrega.fechaEntrega, observaciones: entrega.observaciones }).eq('id', entrega.id);
    });
  },

  createAdolescente: async (adolescente: Omit<Adolescente, 'id'>): Promise<Adolescente> => {
    return withRetry(async () => {
        const dbPayload = { nombre: adolescente.nombre, apellido: adolescente.apellido, cedula: adolescente.cedula, registro: adolescente.registro, fecha_nacimiento: adolescente.fechaNacimiento, barrio: adolescente.barrio, ciudad: adolescente.ciudad, telefono: adolescente.telefono, sexo: adolescente.sexo, estado: adolescente.estado };
        const { data, error } = await supabase.from('adolescentes').insert(dbPayload).select().single();
        const result = handleSupabaseData(data, error, 'createAdolescente');
        // Fix: Removed duplicate 'id' property.
        return { ...adolescente, id: result.id };
    });
  },

  updateAdolescente: async (adolescente: Adolescente): Promise<Adolescente> => {
    // OPTIMIZACIÓN CLAVE: Usamos return: 'minimal' para que la conexión se libere de inmediato
    return withRetry(async () => {
        const { id, ...updateData } = adolescente;
        const dbPayload = { 
            nombre: updateData.nombre, apellido: updateData.apellido, cedula: updateData.cedula, 
            registro: updateData.registro, fecha_nacimiento: updateData.fechaNacimiento, 
            barrio: updateData.barrio, ciudad: updateData.ciudad, telefono: updateData.telefono, 
            sexo: updateData.sexo, estado: updateData.estado 
        };
        
        const { error } = await supabase
            .from('adolescentes')
            .update(dbPayload)
            .eq('id', id); // Quitamos .select() para que sea instantáneo
            
        if (error) throw new Error(error.message);
        
        // Devolvemos el mismo objeto que enviamos para actualizar la UI localmente sin re-consultar
        return adolescente;
    });
  },

  deleteAdolescente: async (id: number): Promise<void> => { await supabase.from('adolescentes').delete().eq('id', id); },

  createAdolescentesBulk: async (adolescentes: Omit<Adolescente, 'id'>[]): Promise<void> => {
    return withRetry(async () => {
        await supabase.from('adolescentes').insert(adolescentes.map(a => ({ nombre: a.nombre, apellido: a.apellido, cedula: a.cedula, registro: a.registro, fecha_nacimiento: a.fechaNacimiento, barrio: a.barrio, ciudad: a.ciudad, telefono: a.telefono, sexo: a.sexo, estado: a.estado })));
    });
  },

  createEncargado: async (encargado: Omit<Encargado, 'id'>): Promise<Encargado> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('encargados').insert({ nombre: encargado.nombre, apellido: encargado.apellido, cedula: encargado.cedula, fecha_nacimiento: encargado.fechaNacimiento || null, barrio: encargado.barrio, ciudad: encargado.ciudad, telefono: encargado.telefono, email: encargado.email || null }).select().single();
        const result = handleSupabaseData(data, error, 'createEncargado');
        // Fix: Removed duplicate 'id' property.
        return { ...encargado, id: result.id };
    });
  },

  updateEncargado: async (encargado: Encargado): Promise<Encargado> => {
    return withRetry(async () => {
        const { id, ...updateData } = encargado;
        const { error } = await supabase.from('encargados').update({ nombre: updateData.nombre, apellido: updateData.apellido, cedula: updateData.cedula, fecha_nacimiento: updateData.fechaNacimiento || null, barrio: updateData.barrio, ciudad: updateData.ciudad, telefono: updateData.telefono, email: updateData.email || null }).eq('id', id);
        if (error) throw new Error(error.message);
        return encargado;
    });
  },

  deleteEncargado: async (id: number): Promise<void> => { await supabase.from('encargados').delete().eq('id', id); },

  createEncargadosBulk: async (encargados: Omit<Encargado, 'id'>[]): Promise<void> => {
    return withRetry(async () => {
        await supabase.from('encargados').insert(encargados.map(e => ({ nombre: e.nombre, apellido: e.apellido, cedula: e.cedula, fecha_nacimiento: e.fechaNacimiento || null, barrio: e.barrio, ciudad: e.ciudad, telefono: e.telefono, email: e.email || null })));
    });
  },

  createReunion: async (reunion: Omit<Reunion, 'id'>): Promise<Reunion> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('reuniones').insert({ fecha: reunion.fecha, tema: reunion.tema, encargado_id: reunion.encargadoId, estado: reunion.estado }).select().single();
        const result = handleSupabaseData(data, error, 'createReunion');
        // Fix: Removed duplicate 'id' property.
        return { ...reunion, id: result.id };
    });
  },

  updateReunion: async (reunion: Reunion): Promise<Reunion> => {
    return withRetry(async () => {
        const { error } = await supabase.from('reuniones').update({ fecha: reunion.fecha, tema: reunion.tema, encargado_id: reunion.encargadoId, estado: reunion.estado }).eq('id', reunion.id);
        if (error) throw new Error(error.message);
        return reunion;
    });
  },

  deleteReunion: async (id: number): Promise<void> => { await supabase.from('reuniones').delete().eq('id', id); },

  createReunionesBulk: async (reuniones: any[]): Promise<void> => {
    return withRetry(async () => {
        const { data: encargados } = await supabase.from('encargados').select('id, cedula');
        if (!encargados) return;
        const dbPayload = reuniones.map(r => {
            const encargado = encargados.find((e: any) => e.cedula === r.encargadoCedula);
            if (!encargado) return null;
            return { fecha: r.fecha, tema: r.tema, estado: r.estado, encargado_id: encargado.id };
        }).filter(Boolean);
        if (dbPayload.length > 0) await supabase.from('reuniones').insert(dbPayload);
    });
  },

  saveAsistencias: async (nuevasAsistencias: Asistencia[]): Promise<void> => {
    return withRetry(async () => {
        await supabase.from('asistencias').upsert(nuevasAsistencias.map(a => ({ reunion_id: a.reunionId, adolescente_id: a.adolescenteId, estado: a.estado, detalle: a.detalle || null })), { onConflict: 'reunion_id,adolescente_id' });
    });
  },

  createTutor: async (tutor: Omit<Tutor, 'id'>): Promise<Tutor> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('tutores').insert({ nombre: tutor.nombre, apellido: tutor.apellido, cedula: tutor.cedula, telefono: tutor.telefono, parentesco: tutor.parentesco, barrio: tutor.barrio, ciudad: tutor.ciudad }).select().single();
        const r = handleSupabaseData(data, error, 'createTutor');
        return { ...tutor, id: r.id };
    });
  },

  updateTutor: async (tutor: Tutor): Promise<Tutor> => {
    return withRetry(async () => {
        const { error } = await supabase.from('tutores').update({ nombre: tutor.nombre, apellido: tutor.apellido, cedula: tutor.cedula, telefono: tutor.telefono, parentesco: tutor.parentesco, barrio: tutor.barrio, ciudad: tutor.ciudad }).eq('id', tutor.id);
        if (error) throw new Error(error.message);
        return tutor;
    });
  },

  deleteTutor: async (id: number): Promise<void> => { await supabase.from('tutores').delete().eq('id', id); },

  setTutorAdolescenteLinks: async (tutorId: number, adolescenteIds: number[]): Promise<void> => {
    return withRetry(async () => {
        await supabase.from('tutor_adolescente').delete().eq('tutor_id', tutorId);
        if (adolescenteIds.length > 0) await supabase.from('tutor_adolescente').insert(adolescenteIds.map(id => ({ tutor_id: tutorId, adolescente_id: id })));
    });
  },

  createTutoresAndLinkBulk: async (tutores: any[]): Promise<void> => {
    return withRetry(async () => {
        const { data: createdTutores, error } = await supabase.from('tutores').insert(tutores.map(t => ({ nombre: t.nombre, apellido: t.apellido, cedula: t.cedula, telefono: t.telefono, parentesco: t.parentesco, barrio: t.barrio, ciudad: t.ciudad }))).select();
        if (error || !createdTutores) return;
        const { data: ados } = await supabase.from('adolescentes').select('id, cedula');
        if (!ados) return;
        const links: any[] = [];
        createdTutores.forEach((nt: any) => {
            const input = tutores.find(t => t.cedula === nt.cedula);
            if (input) {
                input.adolescenteCedulas.split(',').map((c: string) => c.trim()).forEach((c: string) => {
                    const ado = ados.find(a => a.cedula === c);
                    if (ado) links.push({ tutor_id: nt.id, adolescente_id: ado.id });
                });
            }
        });
        if (links.length > 0) await supabase.from('tutor_adolescente').insert(links);
    });
  },
  
  createUsuario: async (usuario: any): Promise<Usuario> => {
    const tempSupabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email: usuario.email, password: usuario.password!, options: { data: { nombre: usuario.nombre, rol_id: usuario.rolId } } });
    if (authError) throw new Error(authError.message);
    const { data, error } = await supabase.from('usuarios').upsert({ id: authData.user?.id, nombre: usuario.nombre, email: usuario.email, rol_id: usuario.rolId }).select().single();
    const result = handleSupabaseData(data, error, 'createUsuario');
    return { ...result, rolId: result.rol_id, lastSignInAt: result.last_sign_in_at };
  },

  updateUsuario: async (usuario: Usuario): Promise<Usuario> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('usuarios').update({ nombre: usuario.nombre, email: usuario.email, rol_id: usuario.rolId }).eq('id', usuario.id).select().single();
        const result = handleSupabaseData(data, error, 'updateUsuario');
        return { ...result, rolId: result.rol_id, lastSignInAt: result.last_sign_in_at };
    });
  },

  deleteUsuario: async (id: string): Promise<void> => {
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) throw new Error(error.message);
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
    if (error) return { success: false, message: 'El rol está en uso.' };
    return { success: true };
  },

  createEvento: async (evento: Omit<Evento, 'id'>): Promise<Evento> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('eventos').insert({ tema: evento.tema, lugar: evento.lugar, fecha_inicio: evento.fechaInicio, hora_inicio: evento.horaInicio, fecha_fin: evento.fechaFin, hora_fin: evento.horaFin, tiene_costo: evento.tieneCosto, costo_total: evento.costoTotal || null, costo_persona: evento.costoPersona || null }).select().single();
        const result = handleSupabaseData(data, error, 'createEvento') as any; 
        return { ...evento, id: result.id };
    });
  },

  updateEvento: async (evento: Evento): Promise<Evento> => {
    return withRetry(async () => {
        const { id, ...updateData } = evento;
        const { error } = await supabase.from('eventos').update({ tema: updateData.tema, lugar: updateData.lugar, fecha_inicio: updateData.fechaInicio, hora_inicio: updateData.horaInicio, fecha_fin: updateData.fechaFin, hora_fin: updateData.horaFin, tiene_costo: updateData.tieneCosto, costo_total: updateData.costoTotal || null, costo_persona: updateData.costoPersona || null }).eq('id', id);
        if (error) throw new Error(error.message);
        return evento;
    });
  },

  deleteEvento: async (id: number): Promise<void> => { await supabase.from('eventos').delete().eq('id', id); },

  createPago: async (pago: Omit<PagoEvento, 'id'>): Promise<PagoEvento> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('pagos_eventos').insert({ inscripcion_id: pago.inscripcionId, monto: pago.monto, fecha: pago.fecha }).select().single();
        const result = handleSupabaseData(data, error, 'createPago');
        return { ...pago, id: result.id };
    });
  },

  deletePago: async (id: number): Promise<void> => { await supabase.from('pagos_eventos').delete().eq('id', id); },

  createInscripcion: async (inscripcion: Omit<InscripcionEvento, 'id'>): Promise<InscripcionEvento> => {
    return withRetry(async () => {
        const { data, error } = await supabase.from('inscripciones_eventos').insert({ evento_id: inscripcion.eventoId, adolescente_id: inscripcion.adolescenteId, fecha_inscripcion: inscripcion.fechaInscripcion, notas: inscripcion.notas }).select().single();
        const result = handleSupabaseData(data, error, 'createInscripcion');
        return { ...inscripcion, id: result.id };
    });
  },

  updateInscripcion: async (i: InscripcionEvento): Promise<InscripcionEvento> => {
    return withRetry(async () => {
        const { error } = await supabase.from('inscripciones_eventos').update({ evento_id: i.eventoId, adolescente_id: i.adolescenteId, fecha_inscripcion: i.fechaInscripcion, notas: i.notas }).eq('id', i.id);
        if (error) throw new Error(error.message);
        return i;
    });
  },

  deleteInscripcion: async (id: number): Promise<void> => { await supabase.from('inscripciones_eventos').delete().eq('id', id); },

  addParticipante: async (p: ParticipanteEvento): Promise<ParticipanteEvento> => {
    return withRetry(async () => {
        await supabase.from('participantes_eventos').insert({ evento_id: p.eventoId, adolescente_id: p.adolescenteId });
        return p;
    });
  },

  removeParticipante: async (eId: number, aId: number): Promise<void> => { await supabase.from('participantes_eventos').delete().eq('evento_id', eId).eq('adolescente_id', aId); },
  
  addCumpleanosCelebrado: async (c: CelebracionCumpleanos): Promise<CelebracionCumpleanos> => {
    return withRetry(async () => {
        await supabase.from('celebraciones_cumpleanos').upsert({ adolescente_id: c.adolescenteId, ano: c.ano }, { onConflict: 'adolescente_id,ano' });
        return c;
    });
  },
  
  clearTable: async (table: string): Promise<void> => { await supabase.from(table).delete().neq('id', -1); },
  createUserProfile: async (profile: Usuario): Promise<Usuario> => { return api.createUsuario(profile); },
};