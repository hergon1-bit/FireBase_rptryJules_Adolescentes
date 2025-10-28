import { 
  Usuario, Rol, Permisos, Adolescente, Encargado, Reunion, Tutor, Evento, Asistencia, 
  TutorAdolescente, InscripcionEvento, PagoEvento, ParticipanteEvento, Sexo, 
  EstadoAdolescente, EstadoReunion, GradoParentesco, TipoAsistencia, AsistenciaDetalle,
  CelebracionCumpleanos
} from '../types';

// --- MOCK DATABASE ---

const defaultPermissions: Permisos = { read: false, create: false, update: false, delete: false };
const readOnlyPermissions: Permisos = { ...defaultPermissions, read: true };
const fullPermissions: Permisos = { read: true, create: true, update: true, delete: true };

let db = {
  roles: [
    { id: 1, nombre: 'Administrador', permisos: { adolescentes: fullPermissions, encargados: fullPermissions, reuniones: fullPermissions, tutores: fullPermissions, eventos: fullPermissions, usuarios: fullPermissions } },
    { id: 2, nombre: 'Encargado', permisos: { adolescentes: { ...fullPermissions, delete: false }, encargados: readOnlyPermissions, reuniones: fullPermissions, tutores: fullPermissions, eventos: fullPermissions, usuarios: { read: true, create: true, update: true, delete: false } } },
    { id: 3, nombre: 'Staff', permisos: { adolescentes: readOnlyPermissions, encargados: readOnlyPermissions, reuniones: readOnlyPermissions, tutores: readOnlyPermissions, eventos: readOnlyPermissions, usuarios: defaultPermissions } },
  ] as Rol[],
  usuarios: [
    { id: 1, email: 'admin@example.com', password: 'admin123', nombre: 'Admin User', rolId: 1, avatarUrl: 'https://i.pravatar.cc/150?u=1' },
    { id: 2, email: 'encargado@example.com', password: 'encargado123', nombre: 'Juan Encargado', rolId: 2, avatarUrl: 'https://i.pravatar.cc/150?u=2' },
    { id: 3, email: 'staff@example.com', password: 'staff123', nombre: 'Ana Staff', rolId: 3, avatarUrl: 'https://i.pravatar.cc/150?u=3' },
  ] as Usuario[],
  adolescentes: [
    { id: 1, nombre: 'Carlos', apellido: 'Gomez', cedula: '5.123.456', fechaNacimiento: '2008-05-15', barrio: 'San Pablo', ciudad: 'Asunción', telefono: '0981-111-222', sexo: 'Masculino', estado: 'Activo' },
    { id: 2, nombre: 'Lucía', apellido: 'Martínez', cedula: '5.234.567', fechaNacimiento: '2009-02-20', barrio: 'Sajonia', ciudad: 'Asunción', telefono: '0981-222-333', sexo: 'Femenino', estado: 'Activo' },
    { id: 3, nombre: 'Pedro', apellido: 'Ramírez', cedula: '5.345.678', fechaNacimiento: '2007-11-30', barrio: 'Centro', ciudad: 'Lambaré', telefono: '0981-333-444', sexo: 'Masculino', estado: 'Activo' },
    { id: 4, nombre: 'Sofía', apellido: 'Benítez', cedula: '5.456.789', fechaNacimiento: '2008-08-10', barrio: 'Villa Morra', ciudad: 'Asunción', telefono: '0981-444-555', sexo: 'Femenino', estado: 'Inactivo' },
    { id: 5, nombre: 'Mateo', apellido: 'González', cedula: '5.567.890', fechaNacimiento: '2010-01-05', barrio: 'Trinidad', ciudad: 'Asunción', telefono: '0981-555-666', sexo: 'Masculino', estado: 'Activo' },
    { id: 6, nombre: 'Valentina', apellido: 'Fernández', cedula: '6.123.456', fechaNacimiento: '2009-07-22', barrio: 'Las Carmelitas', ciudad: 'Asunción', telefono: '0971-111-222', sexo: 'Femenino', estado: 'Activo' },
    { id: 7, nombre: 'Javier', apellido: 'Díaz', cedula: '6.234.567', fechaNacimiento: '2007-03-12', barrio: 'Barcequillo', ciudad: 'San Lorenzo', telefono: '0971-222-333', sexo: 'Masculino', estado: 'Anulado' },
    { id: 8, nombre: 'Camila', apellido: 'Acosta', cedula: '6.345.678', fechaNacimiento: '2008-09-01', barrio: 'Centro', ciudad: 'Luque', telefono: '0971-333-444', sexo: 'Femenino', estado: 'Activo' },
  ] as Adolescente[],
  encargados: [
    { id: 1, nombre: 'Ricardo', apellido: 'Paredes', cedula: '1.111.111', fechaNacimiento: '1990-01-10', barrio: 'Obrero', ciudad: 'Asunción', telefono: '0991-123-456', email: 'ricardo.p@example.com' },
    { id: 2, nombre: 'Laura', apellido: 'Cáceres', cedula: '2.222.222', fechaNacimiento: '1992-06-25', barrio: 'Vista Alegre', ciudad: 'Asunción', telefono: '0991-234-567', email: 'laura.c@example.com' },
    { id: 3, nombre: 'Miguel', apellido: 'Insfrán', cedula: '3.333.333', fechaNacimiento: '1988-12-05', barrio: 'Centro', ciudad: 'Fernando de la Mora', telefono: '0991-345-678', email: 'miguel.i@example.com' },
  ] as Encargado[],
  reuniones: [
    { id: 1, fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], tema: 'Identidad y Propósito', encargadoId: 1, estado: 'Finalizado' },
    { id: 2, fecha: new Date().toISOString().split('T')[0], tema: 'Amistades que edifican', encargadoId: 2, estado: 'En Proceso' },
    { id: 3, fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], tema: 'Manejo de Redes Sociales', encargadoId: 1, estado: 'En Proceso' },
  ] as Reunion[],
  asistencias: [
    { reunionId: 1, adolescenteId: 1, estado: 'Presente', detalle: 'Regular' },
    { reunionId: 1, adolescenteId: 2, estado: 'Presente', detalle: 'Regular' },
    { reunionId: 1, adolescenteId: 3, estado: 'Ausente' },
    { reunionId: 1, adolescenteId: 5, estado: 'Presente', detalle: 'Primera Vez' },
    { reunionId: 1, adolescenteId: 6, estado: 'Presente', detalle: 'Regular' },
    { reunionId: 1, adolescenteId: 8, estado: 'Presente', detalle: 'Regular' },
  ] as Asistencia[],
  tutores: [
    { id: 1, nombre: 'Mario', apellido: 'Gomez', cedula: '3.123.123', parentesco: 'Padre', barrio: 'San Pablo', ciudad: 'Asunción' },
    { id: 2, nombre: 'Ana', apellido: 'Gomez', cedula: '3.321.321', parentesco: 'Madre', barrio: 'San Pablo', ciudad: 'Asunción' },
    { id: 3, nombre: 'Luisa', apellido: 'Martínez', cedula: '4.567.567', parentesco: 'Madre', barrio: 'Sajonia', ciudad: 'Asunción' },
    { id: 4, nombre: 'Alberto', apellido: 'Ramírez', cedula: '2.987.987', parentesco: 'Tío', barrio: 'Centro', ciudad: 'Lambaré' },
  ] as Tutor[],
  tutoresAdolescentes: [
    { tutorId: 1, adolescenteId: 1 },
    { tutorId: 2, adolescenteId: 1 },
    { tutorId: 3, adolescenteId: 2 },
    { tutorId: 4, adolescenteId: 3 },
  ] as TutorAdolescente[],
  eventos: [
    { id: 1, tema: 'Campamento Anual 2024', lugar: 'Ypacaraí', fechaInicio: '2024-10-15', horaInicio: '08:00', fechaFin: '2024-10-18', horaFin: '16:00', tieneCosto: true, costoTotal: 5000000, costoPersona: 250000 },
    { id: 2, tema: 'Taller de Liderazgo Juvenil', lugar: 'Salón Auditorio', fechaInicio: '2024-11-05', horaInicio: '14:00', fechaFin: '2024-11-05', horaFin: '18:00', tieneCosto: false },
  ] as Evento[],
  inscripciones: [
    { id: 1, eventoId: 1, adolescenteId: 1, fechaInscripcion: '2024-09-01', notas: 'Alergia al maní.' },
    { id: 2, eventoId: 1, adolescenteId: 2, fechaInscripcion: '2024-09-03', notas: 'Necesita transporte desde Lambaré.' },
    { id: 3, eventoId: 1, adolescenteId: 5, fechaInscripcion: '2024-09-05' },
    { id: 4, eventoId: 2, adolescenteId: 1, fechaInscripcion: '2024-10-20' },
    { id: 5, eventoId: 2, adolescenteId: 3, fechaInscripcion: '2024-10-21' },
  ] as InscripcionEvento[],
  pagos: [
    { id: 1, inscripcionId: 1, fecha: '2024-09-01', monto: 100000 },
    { id: 2, inscripcionId: 1, fecha: '2024-09-15', monto: 150000 },
    { id: 3, inscripcionId: 2, fecha: '2024-09-03', monto: 250000 },
    { id: 4, inscripcionId: 3, fecha: '2024-09-05', monto: 150000 },
  ] as PagoEvento[],
  participantes: [
    { eventoId: 1, adolescenteId: 1 },
    { eventoId: 1, adolescenteId: 2 },
  ] as ParticipanteEvento[],
  celebracionesCumpleanos: [] as CelebracionCumpleanos[],
};

// --- API FUNCTIONS ---

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const api = {
  // Auth
  login: async (email: string, pass: string): Promise<Usuario | null> => {
    await delay(500);
    const user = db.usuarios.find(u => u.email === email && u.password === pass);
    return user ? { ...user } : null;
  },
  getRolById: async (id: number): Promise<Rol | null> => {
    await delay(100);
    const rol = db.roles.find(r => r.id === id);
    return rol ? { ...rol } : null;
  },

  // Data Getters
  getAdolescentes: async (): Promise<Adolescente[]> => { await delay(200); return [...db.adolescentes]; },
  getEncargados: async (): Promise<Encargado[]> => { await delay(200); return [...db.encargados]; },
  getReuniones: async (): Promise<Reunion[]> => { await delay(200); return [...db.reuniones]; },
  getTutores: async (): Promise<Tutor[]> => { await delay(200); return [...db.tutores]; },
  getEventos: async (): Promise<Evento[]> => { await delay(200); return [...db.eventos]; },
  getAsistencias: async (): Promise<Asistencia[]> => { await delay(200); return [...db.asistencias]; },
  getTutorAdolescente: async (): Promise<TutorAdolescente[]> => { await delay(200); return [...db.tutoresAdolescentes]; },
  getInscripciones: async (): Promise<InscripcionEvento[]> => { await delay(200); return [...db.inscripciones]; },
  getPagos: async (): Promise<PagoEvento[]> => { await delay(200); return [...db.pagos]; },
  getParticipantes: async (): Promise<ParticipanteEvento[]> => { await delay(200); return [...db.participantes]; },
  getUsuarios: async (): Promise<Usuario[]> => { await delay(200); return [...db.usuarios]; },
  getRoles: async (): Promise<Rol[]> => { await delay(200); return [...db.roles]; },
  getCumpleanosCelebrados: async (): Promise<CelebracionCumpleanos[]> => { await delay(100); return [...db.celebracionesCumpleanos]; },

  // Adolescentes CRUD
  createAdolescente: async (adolescente: Omit<Adolescente, 'id'>): Promise<Adolescente> => {
    await delay(300);
    const newId = Math.max(0, ...db.adolescentes.map(a => a.id)) + 1;
    const newAdolescente = { ...adolescente, id: newId };
    db.adolescentes.push(newAdolescente);
    return newAdolescente;
  },
  createAdolescentesBulk: async (adolescentes: Omit<Adolescente, 'id'>[]): Promise<void> => {
    await delay(1000);
    let lastId = Math.max(0, ...db.adolescentes.map(a => a.id));
    const newAdolescentes = adolescentes.map(a => {
        lastId++;
        return { ...a, id: lastId };
    });
    db.adolescentes.push(...newAdolescentes);
  },
  updateAdolescente: async (adolescente: Adolescente): Promise<Adolescente> => {
    await delay(300);
    db.adolescentes = db.adolescentes.map(a => a.id === adolescente.id ? adolescente : a);
    return adolescente;
  },
  deleteAdolescente: async (id: number): Promise<void> => {
    await delay(300);
    db.adolescentes = db.adolescentes.filter(a => a.id !== id);
  },

  // Encargados CRUD
  createEncargado: async (encargado: Omit<Encargado, 'id'>): Promise<Encargado> => {
    await delay(300);
    const newId = Math.max(0, ...db.encargados.map(e => e.id)) + 1;
    const newEncargado = { ...encargado, id: newId };
    db.encargados.push(newEncargado);
    return newEncargado;
  },
  updateEncargado: async (encargado: Encargado): Promise<Encargado> => {
    await delay(300);
    db.encargados = db.encargados.map(e => e.id === encargado.id ? encargado : e);
    return encargado;
  },
  deleteEncargado: async (id: number): Promise<void> => {
    await delay(300);
    db.encargados = db.encargados.filter(e => e.id !== id);
  },
  createEncargadosBulk: async (encargados: Omit<Encargado, 'id'>[]): Promise<void> => {
    await delay(1000);
    let lastId = Math.max(0, ...db.encargados.map(a => a.id));
    const newEncargados = encargados.map(a => {
        lastId++;
        return { ...a, id: lastId };
    });
    db.encargados.push(...newEncargados);
  },

  // Reuniones CRUD
  createReunion: async (reunion: Omit<Reunion, 'id'>): Promise<Reunion> => {
    await delay(300);
    const newId = Math.max(...db.reuniones.map(r => r.id)) + 1;
    const newReunion = { ...reunion, id: newId };
    db.reuniones.push(newReunion);
    return newReunion;
  },
  updateReunion: async (reunion: Reunion): Promise<Reunion> => {
    await delay(300);
    db.reuniones = db.reuniones.map(r => r.id === reunion.id ? reunion : r);
    return reunion;
  },
  createReunionesBulk: async (reuniones: (Omit<Reunion, 'id' | 'encargadoId'> & { encargadoCedula: string })[]): Promise<void> => {
    await delay(1000);
    let lastId = Math.max(0, ...db.reuniones.map(a => a.id));
    const newReuniones: Reunion[] = [];
    for (const r of reuniones) {
        const encargado = db.encargados.find(e => e.cedula === r.encargadoCedula);
        if (encargado) {
            lastId++;
            const { encargadoCedula, ...reunionData } = r;
            newReuniones.push({ ...reunionData, id: lastId, encargadoId: encargado.id, estado: 'En Proceso' });
        }
    }
    db.reuniones.push(...newReuniones);
  },

  // Asistencia
  saveAsistencias: async (nuevasAsistencias: Asistencia[]): Promise<void> => {
    await delay(500);
    nuevasAsistencias.forEach(nueva => {
        const index = db.asistencias.findIndex(a => a.reunionId === nueva.reunionId && a.adolescenteId === nueva.adolescenteId);
        if (index > -1) {
            db.asistencias[index] = nueva;
        } else {
            db.asistencias.push(nueva);
        }
    });
  },
  saveAsistenciasBulk: async (asistencias: { reunionFecha: string; reunionTema: string; adolescenteCedula: string; estado: TipoAsistencia; detalle?: AsistenciaDetalle }[]): Promise<void> => {
    await delay(1000);
    for (const a of asistencias) {
        const reunion = db.reuniones.find(r => r.fecha === a.reunionFecha && r.tema === a.reunionTema);
        const adolescente = db.adolescentes.find(ado => ado.cedula === a.adolescenteCedula);

        if (reunion && adolescente) {
            const newAsistencia: Asistencia = {
                reunionId: reunion.id,
                adolescenteId: adolescente.id,
                estado: a.estado,
                detalle: a.detalle
            };
            const index = db.asistencias.findIndex(existing => existing.reunionId === reunion.id && existing.adolescenteId === adolescente.id);
            if (index > -1) {
                db.asistencias[index] = newAsistencia;
            } else {
                db.asistencias.push(newAsistencia);
            }
        }
    }
  },

  // Tutores CRUD
  createTutor: async (tutor: Omit<Tutor, 'id'>): Promise<Tutor> => {
    await delay(300);
    const newId = Math.max(0, ...db.tutores.map(t => t.id)) + 1;
    const newTutor = { ...tutor, id: newId };
    db.tutores.push(newTutor);
    return newTutor;
  },
  updateTutor: async (tutor: Tutor): Promise<Tutor> => {
    await delay(300);
    db.tutores = db.tutores.map(t => t.id === tutor.id ? tutor : t);
    return tutor;
  },
  deleteTutor: async (id: number): Promise<void> => {
    await delay(300);
    db.tutores = db.tutores.filter(t => t.id !== id);
    // Also remove links
    db.tutoresAdolescentes = db.tutoresAdolescentes.filter(ta => ta.tutorId !== id);
  },
  setTutorAdolescenteLinks: async (tutorId: number, adolescenteIds: number[]): Promise<void> => {
    await delay(200);
    // Remove existing links for this tutor
    db.tutoresAdolescentes = db.tutoresAdolescentes.filter(ta => ta.tutorId !== tutorId);
    // Add new links
    const newLinks: TutorAdolescente[] = adolescenteIds.map(adoId => ({
      tutorId: tutorId,
      adolescenteId: adoId
    }));
    db.tutoresAdolescentes.push(...newLinks);
  },
  createTutoresAndLinkBulk: async (tutores: (Omit<Tutor, 'id'> & { adolescenteCedulas: string })[]): Promise<void> => {
    await delay(1000);
    let lastTutorId = Math.max(0, ...db.tutores.map(t => t.id));

    for (const tutorData of tutores) {
      lastTutorId++;
      const { adolescenteCedulas, ...tutor } = tutorData;
      const newTutor = { ...tutor, id: lastTutorId };
      db.tutores.push(newTutor);
      
      const cedulas = adolescenteCedulas.split(',').map(c => c.trim());
      const adolescenteIds = db.adolescentes
        .filter(a => cedulas.includes(a.cedula))
        .map(a => a.id);
        
      const newLinks: TutorAdolescente[] = adolescenteIds.map(adoId => ({
        tutorId: newTutor.id,
        adolescenteId: adoId
      }));
      db.tutoresAdolescentes.push(...newLinks);
    }
  },
  
  // Usuarios CRUD
  createUsuario: async (usuario: Omit<Usuario, 'id'>): Promise<Usuario> => {
    await delay(300);
    const newId = Math.max(0, ...db.usuarios.map(u => u.id)) + 1;
    const newUsuario = { ...usuario, id: newId };
    db.usuarios.push(newUsuario);
    return newUsuario;
  },
  updateUsuario: async (usuario: Usuario): Promise<Usuario> => {
    await delay(300);
    db.usuarios = db.usuarios.map(u => {
        if (u.id === usuario.id) {
            // Don't overwrite password if it's not provided in the update
            const newPassword = usuario.password ? usuario.password : u.password;
            return { ...usuario, password: newPassword };
        }
        return u;
    });
    return usuario;
  },
  deleteUsuario: async (id: number): Promise<void> => {
    await delay(300);
    db.usuarios = db.usuarios.filter(u => u.id !== id);
  },

  // Roles CRUD
  createRole: async (role: Omit<Rol, 'id'>): Promise<Rol> => {
    await delay(300);
    const newId = Math.max(0, ...db.roles.map(r => r.id)) + 1;
    const newRole = { ...role, id: newId };
    db.roles.push(newRole);
    return newRole;
  },
  updateRole: async (role: Rol): Promise<Rol> => {
    await delay(300);
    db.roles = db.roles.map(r => r.id === role.id ? role : r);
    return role;
  },
  deleteRole: async (id: number): Promise<{ success: boolean; message?: string }> => {
    await delay(300);
    if (id <= 3) { // Prevent deleting base roles
        return { success: false, message: 'No se pueden eliminar los roles base del sistema.' };
    }
    const isRoleInUse = db.usuarios.some(u => u.rolId === id);
    if (isRoleInUse) {
      return { success: false, message: 'No se puede eliminar el rol porque está asignado a uno o más usuarios.' };
    }
    const initialLength = db.roles.length;
    db.roles = db.roles.filter(r => r.id !== id);
    return { success: db.roles.length < initialLength };
  },

  // Eventos CRUD
  createPago: async (pago: Omit<PagoEvento, 'id'>): Promise<PagoEvento> => {
    await delay(300);
    const newId = Math.max(0, ...db.pagos.map(p => p.id)) + 1;
    const newPago = { ...pago, id: newId };
    db.pagos.push(newPago);
    return newPago;
  },
  deletePago: async (id: number): Promise<void> => {
    await delay(300);
    db.pagos = db.pagos.filter(p => p.id !== id);
  },
  createInscripcion: async (inscripcion: Omit<InscripcionEvento, 'id'>): Promise<InscripcionEvento> => {
    await delay(300);
    const newId = Math.max(0, ...db.inscripciones.map(i => i.id)) + 1;
    const newInscripcion = { ...inscripcion, id: newId };
    db.inscripciones.push(newInscripcion);
    return newInscripcion;
  },
  updateInscripcion: async (inscripcion: InscripcionEvento): Promise<InscripcionEvento> => {
    await delay(300);
    db.inscripciones = db.inscripciones.map(i => i.id === inscripcion.id ? inscripcion : i);
    return inscripcion;
  },
  deleteInscripcion: async (id: number): Promise<void> => {
    await delay(300);
    // Also delete associated payments
    db.pagos = db.pagos.filter(p => p.inscripcionId !== id);
    db.inscripciones = db.inscripciones.filter(i => i.id !== id);
  },
  addParticipante: async (participante: ParticipanteEvento): Promise<ParticipanteEvento> => {
    await delay(300);
    if (!db.participantes.some(p => p.eventoId === participante.eventoId && p.adolescenteId === participante.adolescenteId)) {
        db.participantes.push(participante);
    }
    return participante;
  },
  removeParticipante: async (eventoId: number, adolescenteId: number): Promise<void> => {
    await delay(300);
    db.participantes = db.participantes.filter(p => !(p.eventoId === eventoId && p.adolescenteId === adolescenteId));
  },
  
  // Cumpleaños
  addCumpleanosCelebrado: async (celebracion: CelebracionCumpleanos): Promise<CelebracionCumpleanos> => {
    await delay(200);
    const exists = db.celebracionesCumpleanos.some(c => c.adolescenteId === celebracion.adolescenteId && c.ano === celebracion.ano);
    if (!exists) {
        db.celebracionesCumpleanos.push(celebracion);
    }
    return celebracion;
  },
  
  // Data Management
  clearTable: async (tableName: 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos'): Promise<void> => {
    await delay(500);
    switch (tableName) {
        case 'adolescentes':
            db.adolescentes = [];
            db.asistencias = [];
            db.tutoresAdolescentes = [];
            db.inscripciones = [];
            db.pagos = [];
            db.participantes = [];
            db.celebracionesCumpleanos = [];
            break;
        case 'encargados':
            db.encargados = [];
            break;
        case 'reuniones':
            db.reuniones = [];
            db.asistencias = [];
            break;
        case 'tutores':
            db.tutores = [];
            db.tutoresAdolescentes = [];
            break;
        case 'eventos':
            db.eventos = [];
            db.inscripciones = [];
            db.pagos = [];
            db.participantes = [];
            break;
    }
  },
};