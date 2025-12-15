import { supabase } from './supabase';
import { 
  Usuario, Rol, Adolescente, Encargado, Reunion, Tutor, Evento, Asistencia, 
  TutorAdolescente, InscripcionEvento, PagoEvento, ParticipanteEvento, TipoAsistencia, AsistenciaDetalle,
  CelebracionCumpleanos, ResumenReunion
} from '../types';

// Helper to handle Supabase responses and throw proper Errors
const handleSupabaseData = <T>(data: T | null, error: any, context: string): T => {
    if (error) {
        // Safe error serialization to prevent [object Object] in logs
        const errorMsg = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error(`Error in ${context}: ${errorMsg}`);
        throw new Error(errorMsg);
    }
    return data as T;
};

// Generic helper to fetch ALL rows via pagination, bypassing the 10k limit
const fetchAllRows = async (
    table: string, 
    select: string, 
    orderBy?: { column: string, ascending: boolean }
) => {
    let allData: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; // Efficient chunk size for Supabase

    while (hasMore) {
        let query = supabase.from(table).select(select).range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending });
        }
        
        const { data, error } = await query;
        
        if (error) throw error;

        if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }
        page++;
    }
    return allData;
};

// Constant for maximum rows to fetch to avoid Supabase default limit of 1000 (kept for non-paginated legacy calls if any)
const MAX_ROWS = 10000;

export const api = {
  // --- Auth & User Profile ---
  getUsuarioById: async (id: string): Promise<Usuario | null> => {
    const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single();
    if (error) return null; // Return null for auth check if user not found/error
    return {
        ...data,
        rolId: data.rol_id,
    };
  },
  getRolById: async (id: number): Promise<Rol | null> => {
    const { data, error } = await supabase.from('roles').select('*').eq('id', id).single();
    if (error) return null;
    return data;
  },

  // Password Reset Methods
  resetPasswordForEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Redirects to root, App.tsx will intercept event
    });
    if (error) throw new Error(error.message);
  },
  
  updateCurrentUserPassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  },

  // --- Data Getters ---
  getAdolescentes: async (): Promise<Adolescente[]> => {
    try {
        // Now using fetchAllRows to remove limits
        const data = await fetchAllRows(
            'adolescentes', 
            'id, nombre, apellido, cedula, fecha_nacimiento, barrio, ciudad, telefono, sexo, estado',
            { column: 'nombre', ascending: true }
        );
        return data.map((a: any) => ({
            id: a.id,
            nombre: a.nombre,
            apellido: a.apellido,
            cedula: a.cedula,
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
        const data = await fetchAllRows(
            'tutores',
            '*',
            { column: 'nombre', ascending: true }
        );
        return data as Tutor[];
    } catch (error) {
        handleSupabaseData(null, error, 'getTutores');
        return [];
    }
  },
  getEventos: async (): Promise<Evento[]> => {
    try {
        const data = await fetchAllRows(
            'eventos',
            '*',
            { column: 'fecha_inicio', ascending: false }
        );
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
        const data = await fetchAllRows(
            'asistencias',
            'reunion_id, adolescente_id, estado, detalle'
        );
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
    // Specific fetch for a single meeting to ensure data accuracy in detailed views
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
  // --- New method for fetching Attendance Summary from View ---
  getResumenReuniones: async (): Promise<ResumenReunion[]> => {
    const { data, error } = await supabase.from('view_resumen_asistencia').select('*');
    if (error) {
        console.warn("Could not fetch view_resumen_asistencia", error);
        return [];
    }
    return (data || []).map((r: any) => ({
        reunionId: r.reunion_id,
        presentes: r.presentes || 0,
        ausentes: r.ausentes || 0
    }));
  },
  getTutorAdolescente: async (): Promise<TutorAdolescente[]> => {
    const { data, error } = await supabase
        .from('tutor_adolescente')
        .select('*')
        .range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getTutorAdolescente');
    return (result || []).map((ta: any) => ({
        tutorId: ta.tutor_id ?? ta.tutorId,
        adolescenteId: ta.adolescente_id ?? ta.adolescenteId
    }));
  },
  getInscripciones: async (): Promise<InscripcionEvento[]> => {
    const { data, error } = await supabase
        .from('inscripciones_eventos')
        .select('*')
        .range(0, MAX_ROWS);
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
    const { data, error } = await supabase
        .from('pagos_eventos')
        .select('*')
        .range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getPagos');
    return (result || []).map((p: any) => ({
        id: p.id,
        inscripcionId: p.inscripcion_id ?? p.inscripcionId,
        fecha: p.fecha,
        monto: p.monto
    }));
  },
  getParticipantes: async (): Promise<ParticipanteEvento[]> => {
    const { data, error } = await supabase
        .from('participantes_eventos')
        .select('*')
        .range(0, MAX_ROWS);
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
        avatarUrl: u.avatar_url ?? u.avatarUrl
    }));
  },
  getRoles: async (): Promise<Rol[]> => {
    const { data, error } = await supabase.from('roles').select('*').order('id', { ascending: true });
    const result = handleSupabaseData(data, error, 'getRoles');
    return result || [];
  },
  getCumpleanosCelebrados: async (): Promise<CelebracionCumpleanos[]> => {
    const { data, error } = await supabase
        .from('celebraciones_cumpleanos')
        .select('adolescente_id, ano')
        .range(0, MAX_ROWS);
    const result = handleSupabaseData(data, error, 'getCumpleanosCelebrados');
    return (result || []).map((c: any) => ({
        adolescenteId: c.adolescente_id ?? c.adolescenteId,
        ano: c.ano
    }));
  },

  // --- CRUD Operations ---

  // Adolescentes
  createAdolescente: async (adolescente: Omit<Adolescente, 'id'>): Promise<Adolescente> => {
    const dbPayload = {
        nombre: adolescente.nombre,
        apellido: adolescente.apellido,
        cedula: adolescente.cedula,
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
        fechaNacimiento: result.fecha_nacimiento,
        barrio: result.barrio,
        ciudad: result.ciudad,
        telefono: result.telefono,
        sexo: result.sexo,
        estado: result.estado
    };
  },
  createAdolescentesBulk: async (adolescentes: Omit<Adolescente, 'id'>[]): Promise<void> => {
    const dbPayload = adolescentes.map(a => ({
        nombre: a.nombre,
        apellido: a.apellido,
        cedula: a.cedula,
        fecha_nacimiento: a.fechaNacimiento,
        barrio: a.barrio,
        ciudad: a.ciudad,
        telefono: a.telefono,
        sexo: a.sexo,
        estado: a.estado
    }));
    const { error } = await supabase.from('adolescentes').insert(dbPayload);
    if (error) {
        const msg = error.message || JSON.stringify(error);
        throw new Error(msg);
    }
  },
  updateAdolescente: async (adolescente: Adolescente): Promise<Adolescente> => {
    const dbPayload = {
        nombre: adolescente.nombre,
        apellido: adolescente.apellido,
        cedula: adolescente.cedula,
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
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Encargados
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
    if (error) throw new Error(error.message || JSON.stringify(error));
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
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Reuniones
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
    if (error) throw new Error(error.message || JSON.stringify(error));
  },
  createReunionesBulk: async (reuniones: (Omit<Reunion, 'id' | 'encargadoId'> & { encargadoCedula: string })[]): Promise<void> => {
    const { data: encargados } = await supabase.from('encargados').select('id, cedula');
    
    if (!encargados) throw new Error("No se pudieron cargar encargados para validación");

    const dbPayload = reuniones.map(r => {
        const encargado = encargados.find((e: any) => e.cedula === r.encargadoCedula);
        if (!encargado) return null;
        return {
            fecha: r.fecha,
            tema: r.tema,
            estado: r.estado,
            encargado_id: encargado.id
        };
    }).filter(Boolean);

    if (dbPayload.length > 0) {
        const { error } = await supabase.from('reuniones').insert(dbPayload);
        if (error) throw new Error(error.message || JSON.stringify(error));
    }
  },

  // Asistencia
  saveAsistencias: async (nuevasAsistencias: Asistencia[]): Promise<void> => {
    // Explicitly map strictly to DB columns for the upsert
    const dbPayload = nuevasAsistencias.map(a => ({
        reunion_id: a.reunionId,
        adolescente_id: a.adolescenteId,
        estado: a.estado,
        detalle: a.detalle || null
    }));
    
    // Uses the composite primary key (reunion_id, adolescente_id) for conflict resolution
    const { error } = await supabase.from('asistencias').upsert(dbPayload, { onConflict: 'reunion_id,adolescente_id' });
    if (error) throw new Error(error.message || JSON.stringify(error));
  },
   saveAsistenciasBulk: async (asistencias: { reunionFecha: string; reunionTema: string; adolescenteCedula: string; estado: TipoAsistencia; detalle?: AsistenciaDetalle }[]): Promise<void> => {
    const { data: reuniones } = await supabase.from('reuniones').select('id, fecha, tema');
    const { data: adolescentes } = await supabase.from('adolescentes').select('id, cedula');

    if (!reuniones || !adolescentes) throw new Error("Error cargando referencias para importar asistencias");

    const dbPayload = asistencias.map(a => {
        const reunion = reuniones.find((r: any) => r.fecha === a.reunionFecha && r.tema === a.reunionTema);
        const adolescente = adolescentes.find((ad: any) => ad.cedula === a.adolescenteCedula);
        
        if (reunion && adolescente) {
            return {
                reunion_id: reunion.id,
                adolescente_id: adolescente.id,
                estado: a.estado,
                detalle: a.detalle || 'Regular'
            };
        }
        return null;
    }).filter(Boolean);

    if (dbPayload.length > 0) {
        const { error } = await supabase.from('asistencias').upsert(dbPayload, { onConflict: 'reunion_id,adolescente_id' });
        if (error) throw new Error(error.message || JSON.stringify(error));
    }
  },


  // Tutores
  createTutor: async (tutor: Omit<Tutor, 'id'>): Promise<Tutor> => {
    const dbPayload = {
        nombre: tutor.nombre,
        apellido: tutor.apellido,
        cedula: tutor.cedula,
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
        parentesco: tutor.parentesco,
        barrio: tutor.barrio,
        ciudad: tutor.ciudad
    };
    const { data, error } = await supabase.from('tutores').update(dbPayload).eq('id', tutor.id).select().single();
    const result = handleSupabaseData(data, error, 'updateTutor');
    return result;
  },
  deleteTutor: async (id: number): Promise<void> => {
    const { error } = await supabase.from('tutores').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },
  setTutorAdolescenteLinks: async (tutorId: number, adolescenteIds: number[]): Promise<void> => {
    const { error: deleteError } = await supabase.from('tutor_adolescente').delete().eq('tutor_id', tutorId);
    if (deleteError) throw new Error(deleteError.message || JSON.stringify(deleteError));

    if (adolescenteIds.length > 0) {
        const payload = adolescenteIds.map(id => ({ tutor_id: tutorId, adolescente_id: id }));
        const { error: insertError } = await supabase.from('tutor_adolescente').insert(payload);
        if (insertError) throw new Error(insertError.message || JSON.stringify(insertError));
    }
  },
  createTutoresAndLinkBulk: async (tutores: (Omit<Tutor, 'id'> & { adolescenteCedulas: string })[]): Promise<void> => {
    const tutoresPayload = tutores.map(t => ({
        nombre: t.nombre, apellido: t.apellido, cedula: t.cedula, parentesco: t.parentesco,
        barrio: t.barrio, ciudad: t.ciudad
    }));
    
    const { data: createdTutores, error: tutorError } = await supabase.from('tutores').insert(tutoresPayload).select();
    if (tutorError) throw new Error(tutorError.message || JSON.stringify(tutorError));
    if (!createdTutores) return;

    const { data: adolescentes } = await supabase.from('adolescentes').select('id, cedula');
    if (!adolescentes) return;

    const linksPayload: any[] = [];
    
    createdTutores.forEach((newTutor: any) => {
        const originalInput = tutores.find(t => t.cedula === newTutor.cedula);
        if (originalInput && originalInput.adolescenteCedulas) {
            const cedulas = originalInput.adolescenteCedulas.split(',').map(c => c.trim());
            cedulas.forEach(c => {
                const ado = adolescentes.find((a: any) => a.cedula === c);
                if (ado) {
                    linksPayload.push({ tutor_id: newTutor.id, adolescente_id: ado.id });
                }
            });
        }
    });

    if (linksPayload.length > 0) {
        const { error: linkError } = await supabase.from('tutor_adolescente').insert(linksPayload);
        if (linkError) throw new Error(linkError.message || JSON.stringify(linkError));
    }
  },
  
  // Usuarios & Roles
  createUsuario: async (usuario: Omit<Usuario, 'id' | 'password'> & { id?: string, password?: string }): Promise<Usuario> => {
    // 1. Create the user in Supabase Auth (Sign Up)
    if (!usuario.password) {
        throw new Error("Se requiere una contraseña para crear un usuario nuevo.");
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: usuario.email,
        password: usuario.password,
        options: {
            data: {
                nombre: usuario.nombre
            }
        }
    });

    if (authError) {
         const msg = authError.message || JSON.stringify(authError);
         console.error("Auth creation failed:", msg);
         throw new Error(`Error creando usuario en Auth: ${msg}`);
    }
    
    // 2. Get the ID from the Auth response
    const userId = authData.user?.id;
    if (!userId) {
         throw new Error("No se pudo obtener el ID del usuario creado en Auth.");
    }

    // 3. Insert into public.usuarios using the retrieved ID
    const dbPayload = {
        id: userId, 
        nombre: usuario.nombre,
        email: usuario.email,
        rol_id: usuario.rolId,
        avatar_url: usuario.avatarUrl
    };

    const { data, error } = await supabase.from('usuarios').insert(dbPayload).select().single();
    
    const result = handleSupabaseData(data, error, 'createUsuario');
    return { ...result, rolId: result.rol_id, avatarUrl: result.avatar_url };
  },
  updateUsuario: async (usuario: Usuario & { password?: string }): Promise<Usuario> => {
    const dbPayload = {
        nombre: usuario.nombre,
        email: usuario.email,
        rol_id: usuario.rolId,
        avatar_url: usuario.avatarUrl
    };
    const { data, error } = await supabase.from('usuarios').update(dbPayload).eq('id', usuario.id).select().single();
    const result = handleSupabaseData(data, error, 'updateUsuario');
    return { ...result, rolId: result.rol_id, avatarUrl: result.avatar_url };
  },
  deleteUsuario: async (id: string): Promise<void> => {
    const { error } = await supabase.from('usuarios').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  createRole: async (role: Omit<Rol, 'id'>): Promise<Rol> => {
    const { data, error } = await supabase.from('roles').insert(role).select().single();
    const result = handleSupabaseData(data, error, 'createRole');
    return result;
  },
  updateRole: async (role: Rol): Promise<Rol> => {
    const { data, error } = await supabase.from('roles').update(role).eq('id', role.id).select().single();
    const result = handleSupabaseData(data, error, 'updateRole');
    return result;
  },
  deleteRole: async (id: number): Promise<{ success: boolean; message?: string }> => {
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) {
        if (error.code === '23503') {
             return { success: false, message: 'No se puede eliminar el rol porque está asignado a uno o más usuarios.' };
        }
        throw new Error(error.message || JSON.stringify(error));
    }
    return { success: true };
  },

  // Eventos
  createEvento: async (evento: Omit<Evento, 'id'>): Promise<Evento> => {
    const dbPayload = {
      tema: evento.tema,
      lugar: evento.lugar,
      fecha_inicio: evento.fechaInicio,
      hora_inicio: evento.horaInicio,
      fecha_fin: evento.fechaFin,
      hora_fin: evento.horaFin,
      tiene_costo: evento.tieneCosto,
      costo_total: evento.costoTotal || null,
      costo_persona: evento.costoPersona || null
    };
    const { data, error } = await supabase.from('eventos').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createEvento');
    return {
        id: result.id,
        tema: result.tema,
        lugar: result.lugar,
        fechaInicio: result.fecha_inicio,
        horaInicio: result.hora_inicio,
        fechaFin: result.fecha_fin,
        horaFin: result.hora_fin,
        tieneCosto: result.tiene_costo,
        costoTotal: result.costo_total,
        costoPersona: result.costo_persona
    };
  },
  updateEvento: async (evento: Evento): Promise<Evento> => {
    const dbPayload = {
      tema: evento.tema,
      lugar: evento.lugar,
      fecha_inicio: evento.fechaInicio,
      hora_inicio: evento.horaInicio,
      fecha_fin: evento.fechaFin,
      hora_fin: evento.horaFin,
      tiene_costo: evento.tieneCosto,
      costo_total: evento.costoTotal || null,
      costo_persona: evento.costoPersona || null
    };
    const { data, error } = await supabase.from('eventos').update(dbPayload).eq('id', evento.id).select().single();
    const result = handleSupabaseData(data, error, 'updateEvento');
    return {
        id: result.id,
        tema: result.tema,
        lugar: result.lugar,
        fechaInicio: result.fecha_inicio,
        horaInicio: result.hora_inicio,
        fechaFin: result.fecha_fin,
        horaFin: result.hora_fin,
        tieneCosto: result.tiene_costo, // Mapped correctly from DB result (snake to camel)
        costoTotal: result.costo_total,
        costoPersona: result.costo_persona
    };
  },
  deleteEvento: async (id: number): Promise<void> => {
    const { error } = await supabase.from('eventos').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  createPago: async (pago: Omit<PagoEvento, 'id'>): Promise<PagoEvento> => {
    const dbPayload = {
        inscripcion_id: pago.inscripcionId,
        monto: pago.monto,
        fecha: pago.fecha
    };
    const { data, error } = await supabase.from('pagos_eventos').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createPago');
    return { 
        id: result.id,
        inscripcionId: result.inscripcion_id,
        fecha: result.fecha,
        monto: result.monto
    };
  },
  deletePago: async (id: number): Promise<void> => {
    const { error } = await supabase.from('pagos_eventos').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },
  createInscripcion: async (inscripcion: Omit<InscripcionEvento, 'id'>): Promise<InscripcionEvento> => {
    const dbPayload = {
        evento_id: inscripcion.eventoId,
        adolescente_id: inscripcion.adolescenteId,
        fecha_inscripcion: inscripcion.fechaInscripcion,
        notas: inscripcion.notas
    };
    const { data, error } = await supabase.from('inscripciones_eventos').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'createInscripcion');
    return { 
        id: result.id,
        eventoId: result.evento_id,
        adolescenteId: result.adolescente_id,
        fechaInscripcion: result.fecha_inscripcion,
        notas: result.notas
    };
  },
  updateInscripcion: async (inscripcion: InscripcionEvento): Promise<InscripcionEvento> => {
    const dbPayload = {
        evento_id: inscripcion.eventoId,
        adolescente_id: inscripcion.adolescenteId,
        fecha_inscripcion: inscripcion.fechaInscripcion,
        notas: inscripcion.notas
    };
    const { data, error } = await supabase.from('inscripciones_eventos').update(dbPayload).eq('id', inscripcion.id).select().single();
    const result = handleSupabaseData(data, error, 'updateInscripcion');
    return { 
        id: result.id,
        eventoId: result.evento_id,
        adolescenteId: result.adolescente_id,
        fechaInscripcion: result.fecha_inscripcion,
        notas: result.notas
    };
  },
  deleteInscripcion: async (id: number): Promise<void> => {
    const { error } = await supabase.from('inscripciones_eventos').delete().eq('id', id);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },
  addParticipante: async (participante: ParticipanteEvento): Promise<ParticipanteEvento> => {
    const dbPayload = {
        evento_id: participante.eventoId,
        adolescente_id: participante.adolescenteId
    };
    const { data, error } = await supabase.from('participantes_eventos').insert(dbPayload).select().single();
    const result = handleSupabaseData(data, error, 'addParticipante');
    return { eventoId: result.evento_id, adolescenteId: result.adolescente_id };
  },
  removeParticipante: async (eventoId: number, adolescenteId: number): Promise<void> => {
    const { error } = await supabase.from('participantes_eventos').delete().eq('evento_id', eventoId).eq('adolescente_id', adolescenteId);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },
  
  // Cumpleaños
  addCumpleanosCelebrado: async (celebracion: CelebracionCumpleanos): Promise<CelebracionCumpleanos> => {
    const dbPayload = {
        adolescente_id: celebracion.adolescenteId,
        ano: celebracion.ano
    };
    // Use upsert to handle potential duplicates on primary key (adolescente_id, ano) gracefully
    const { data, error } = await supabase.from('celebraciones_cumpleanos').upsert(dbPayload, { onConflict: 'adolescente_id,ano' }).select().single();
    const result = handleSupabaseData(data, error, 'addCumpleanosCelebrado');
    return { adolescenteId: result.adolescente_id, ano: result.ano };
  },
  
  // Data Management
  clearTable: async (tableName: 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos'): Promise<void> => {
    const { error } = await supabase.from(tableName).delete().neq('id', 0);
    if (error) throw new Error(error.message || JSON.stringify(error));
  },

  // Profile Management
  createUserProfile: async (profile: Usuario): Promise<Usuario> => {
     return api.createUsuario(profile);
  },
};