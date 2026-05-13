import { db, auth } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, writeBatch
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail 
} from 'firebase/auth';
import { 
  Usuario, Rol, Adolescente, Encargado, Reunion, Tutor, Evento, Asistencia, 
  TutorAdolescente, InscripcionEvento, PagoEvento, ParticipanteEvento, TipoAsistencia, AsistenciaDetalle,
  CelebracionCumpleanos, ResumenReunion, Devocional, EntregaDevocional,
  Servidor, InscripcionServidor, PagoServidor
} from '../types';

const normalizeRol = (rol: any): Rol => {
  const defaultPerms = { read: false, create: false, update: false, delete: false };
  if (!rol) {
      return {
          id: '0', nombre: 'Invitado',
          permisos: {
            adolescentes: { ...defaultPerms }, asistencias: { ...defaultPerms }, celebraciones_cumpleanos: { ...defaultPerms },
            devocionales: { ...defaultPerms }, encargados: { ...defaultPerms }, entregas_devocionales: { ...defaultPerms },
            eventos: { ...defaultPerms }, inscripciones_eventos: { ...defaultPerms }, inscripciones_servidores: { ...defaultPerms },
            pagos_eventos: { ...defaultPerms }, pagos_servidores: { ...defaultPerms }, participantes_eventos: { ...defaultPerms },
            reuniones: { ...defaultPerms }, roles: { ...defaultPerms }, servidores: { ...defaultPerms },
            tutor_adolescente: { ...defaultPerms }, tutores: { ...defaultPerms }, usuarios: { ...defaultPerms },
          }
      };
  }
  return {
    ...rol,
    permisos: {
      adolescentes: rol.permisos?.adolescentes || { ...defaultPerms },
      asistencias: rol.permisos?.asistencias || rol.permisos?.reuniones || { ...defaultPerms },
      celebraciones_cumpleanos: rol.permisos?.celebraciones_cumpleanos || { ...defaultPerms },
      devocionales: rol.permisos?.devocionales || rol.permisos?.tareas || { ...defaultPerms },
      encargados: rol.permisos?.encargados || { ...defaultPerms },
      entregas_devocionales: rol.permisos?.entregas_devocionales || rol.permisos?.entregas || rol.permisos?.tareas || { ...defaultPerms },
      eventos: rol.permisos?.eventos || { ...defaultPerms },
      inscripciones_eventos: rol.permisos?.inscripciones_eventos || rol.permisos?.inscripciones || { ...defaultPerms },
      inscripciones_servidores: rol.permisos?.inscripciones_servidores || rol.permisos?.inscripciones || { ...defaultPerms },
      pagos_eventos: rol.permisos?.pagos_eventos || rol.permisos?.pagos || { ...defaultPerms },
      pagos_servidores: rol.permisos?.pagos_servidores || rol.permisos?.pagos || { ...defaultPerms },
      participantes_eventos: rol.permisos?.participantes_eventos || rol.permisos?.participantes || { ...defaultPerms },
      reuniones: rol.permisos?.reuniones || { ...defaultPerms },
      roles: rol.permisos?.roles || rol.permisos?.usuarios || { ...defaultPerms },
      servidores: rol.permisos?.servidores || rol.permisos?.participantes || { ...defaultPerms },
      tutor_adolescente: rol.permisos?.tutor_adolescente || rol.permisos?.tutores || { ...defaultPerms },
      tutores: rol.permisos?.tutores || { ...defaultPerms },
      usuarios: rol.permisos?.usuarios || { ...defaultPerms },
    }
  };
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const api = {
  getUsuarioById: async (id: string): Promise<Usuario | null> => {
    try {
      const docSnap = await getDoc(doc(db, 'usuarios', String(id)));
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Usuario;
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'usuarios');
      return null;
    }
  },

  getUsuarioByEmail: async (email: string): Promise<Usuario | null> => {
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', email));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Usuario;
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, 'usuarios');
      return null;
    }
  },

  migrateUsuarioId: async (oldId: string, newId: string, userData: any): Promise<void> => {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'usuarios', newId), userData);
      batch.delete(doc(db, 'usuarios', oldId));
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'usuarios');
    }
  },
  
  getRolById: async (id: string): Promise<Rol | null> => {
    try {
      const docSnap = await getDoc(doc(db, 'roles', String(id)));
      if (!docSnap.exists()) return null;
      return normalizeRol({ id: docSnap.id, ...docSnap.data() });
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, 'roles');
      return null;
    }
  },

  isFirstRun: async (): Promise<boolean> => {
    try {
      const docSnap = await getDoc(doc(db, 'public', 'config'));
      if (docSnap.exists() && docSnap.data().isInitialized) {
        return false;
      }
      return true;
    } catch (e) { 
      console.error("Error verificando primera ejecución:", e);
      return false; 
    }
  },

  ensureDefaultRoles: async (): Promise<void> => {
    try {
      const rolesRef = collection(db, 'roles');
      const snapshot = await getDocs(query(rolesRef, limit(1)));
      if (!snapshot.empty) return;
      
      const defaultPerms = { read: true, create: true, update: true, delete: true };
      const guestPerms = { read: true, create: false, update: false, delete: false };
      
      await setDoc(doc(db, 'roles', '1'), { nombre: 'Administrador', permisos: { adolescentes: defaultPerms, asistencias: defaultPerms, celebraciones_cumpleanos: defaultPerms, devocionales: defaultPerms, encargados: defaultPerms, entregas_devocionales: defaultPerms, eventos: defaultPerms, inscripciones_eventos: defaultPerms, inscripciones_servidores: defaultPerms, pagos_eventos: defaultPerms, pagos_servidores: defaultPerms, participantes_eventos: defaultPerms, reuniones: defaultPerms, roles: defaultPerms, servidores: defaultPerms, tutor_adolescente: defaultPerms, tutores: defaultPerms, usuarios: defaultPerms } });
      await setDoc(doc(db, 'roles', '2'), { nombre: 'Encargado', permisos: { adolescentes: defaultPerms, asistencias: defaultPerms, celebraciones_cumpleanos: guestPerms, devocionales: guestPerms, encargados: guestPerms, entregas_devocionales: defaultPerms, eventos: guestPerms, inscripciones_eventos: defaultPerms, inscripciones_servidores: defaultPerms, pagos_eventos: defaultPerms, pagos_servidores: defaultPerms, participantes_eventos: defaultPerms, reuniones: defaultPerms, roles: guestPerms, servidores: defaultPerms, tutor_adolescente: defaultPerms, tutores: defaultPerms, usuarios: guestPerms } });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'roles');
    }
  },
  
  updateLastSignIn: async (id: string): Promise<void> => {
    try { 
      await updateDoc(doc(db, 'usuarios', id), { lastSignInAt: new Date().toISOString() }); 
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'usuarios');
    }
  },

  resetPasswordForEmail: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (e) {
      throw e;
    }
  },
  
  updateCurrentUserPassword: async (password: string) => {
    if (auth.currentUser) {
      await updatePassword(auth.currentUser, password);
    }
  },

  getAdolescentes: async (): Promise<Adolescente[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'adolescentes'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Adolescente));
    } catch (error: any) { 
        handleFirestoreError(error, OperationType.LIST, 'adolescentes');
        return []; 
    }
  },

  getServidores: async (): Promise<Servidor[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'servidores'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Servidor));
    } catch (error) { 
        handleFirestoreError(error, OperationType.LIST, 'servidores');
        return []; 
    }
  },

  createServidor: async (s: Omit<Servidor, 'id'>): Promise<Servidor> => {
    try {
        const docRef = await addDoc(collection(db, 'servidores'), s);
        return { id: docRef.id, ...s };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'servidores');
        throw error;
    }
  },

  updateServidor: async (s: Servidor): Promise<Servidor> => {
    try {
        const { id, ...rest } = s;
        await updateDoc(doc(db, 'servidores', id), rest as any);
        return s;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'servidores');
        throw error;
    }
  },

  deleteServidor: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'servidores', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'servidores');
    }
  },

  getInscripcionesServidores: async (): Promise<InscripcionServidor[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'inscripciones_servidores'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InscripcionServidor));
    } catch (e) { 
        handleFirestoreError(e, OperationType.LIST, 'inscripciones_servidores');
        return []; 
    }
  },

  createInscripcionServidor: async (i: Omit<InscripcionServidor, 'id'>): Promise<InscripcionServidor> => {
    try {
        const docRef = await addDoc(collection(db, 'inscripciones_servidores'), i);
        return { id: docRef.id, ...i };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'inscripciones_servidores');
        throw error;
    }
  },

  updateInscripcionServidor: async (i: InscripcionServidor): Promise<void> => {
    try {
        const { id, ...rest } = i;
        await updateDoc(doc(db, 'inscripciones_servidores', id), rest as any);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'inscripciones_servidores');
        throw error;
    }
  },

  deleteInscripcionServidor: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'inscripciones_servidores', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inscripciones_servidores');
    }
  },

  getPagosServidores: async (): Promise<PagoServidor[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'pagos_servidores'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PagoServidor));
    } catch (e) { 
        handleFirestoreError(e, OperationType.LIST, 'pagos_servidores');
        return []; 
    }
  },

  createPagoServidor: async (p: Omit<PagoServidor, 'id'>): Promise<PagoServidor> => {
    try {
        const docRef = await addDoc(collection(db, 'pagos_servidores'), p);
        return { id: docRef.id, ...p };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'pagos_servidores');
        throw error;
    }
  },

  deletePagoServidor: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'pagos_servidores', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pagos_servidores');
    }
  },

  getEncargados: async (): Promise<Encargado[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'encargados'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encargado));
    } catch (error) { 
        handleFirestoreError(error, OperationType.LIST, 'encargados');
        return []; 
    }
  },

  getReuniones: async (): Promise<Reunion[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'reuniones'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reunion));
    } catch (error) { 
        handleFirestoreError(error, OperationType.LIST, 'reuniones');
        return []; 
    }
  },

  getTutores: async (): Promise<Tutor[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'tutores'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tutor));
    } catch (error) { 
        handleFirestoreError(error, OperationType.LIST, 'tutores');
        return []; 
    }
  },

  getEventos: async (): Promise<Evento[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'eventos'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Evento));
    } catch (error) { 
        handleFirestoreError(error, OperationType.LIST, 'eventos');
        return []; 
    }
  },

  getAsistencias: async (): Promise<Asistencia[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'asistencias'));
        return snapshot.docs.map(doc => doc.data() as Asistencia);
    } catch (error) { 
        handleFirestoreError(error, OperationType.LIST, 'asistencias');
        return []; 
    }
  },

  getAsistenciasByReunion: async (reunionId: string): Promise<Asistencia[]> => {
    try {
      const searchValues: any[] = [reunionId];
      if (!isNaN(Number(reunionId))) {
          searchValues.push(Number(reunionId));
      }
      const q = query(collection(db, 'asistencias'), where('reunionId', 'in', searchValues));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Asistencia);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'asistencias');
      return [];
    }
  },

  getResumenReuniones: async (): Promise<ResumenReunion[]> => {
    // In Firebase we don't have views, we need to calculate this on the fly or keep a counter.
    // For now, we'll fetch all asistencias and group them.
    try {
      const snapshot = await getDocs(collection(db, 'asistencias'));
      const asistencias = snapshot.docs.map(doc => doc.data() as Asistencia);
      const resumen: Record<string, ResumenReunion> = {};
      
      asistencias.forEach(a => {
        if (!resumen[a.reunionId]) {
          resumen[a.reunionId] = { reunionId: a.reunionId, presentes: 0, ausentes: 0 };
        }
        if (a.estado === 'Presente') resumen[a.reunionId].presentes++;
        else if (a.estado === 'Ausente') resumen[a.reunionId].ausentes++;
      });
      
      return Object.values(resumen);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'asistencias');
      return [];
    }
  },

  getTutorAdolescente: async (): Promise<TutorAdolescente[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'tutor_adolescente'));
      return snapshot.docs.map(doc => doc.data() as TutorAdolescente);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'tutor_adolescente');
      return [];
    }
  },

  getInscripciones: async (): Promise<InscripcionEvento[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'inscripciones_eventos'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as InscripcionEvento));
    } catch (e) { 
        handleFirestoreError(e, OperationType.LIST, 'inscripciones_eventos');
        return []; 
    }
  },

  getPagos: async (): Promise<PagoEvento[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'pagos_eventos'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PagoEvento));
    } catch (e) { 
        handleFirestoreError(e, OperationType.LIST, 'pagos_eventos');
        return []; 
    }
  },

  getParticipantes: async (): Promise<ParticipanteEvento[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'participantes_eventos'));
      return snapshot.docs.map(doc => doc.data() as ParticipanteEvento);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'participantes_eventos');
      return [];
    }
  },

  getUsuarios: async (): Promise<Usuario[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'usuarios'));
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Usuario));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'usuarios');
      return [];
    }
  },

  getRoles: async (): Promise<Rol[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'roles'));
      return snapshot.docs.map(doc => normalizeRol({ ...doc.data(), id: doc.id }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'roles');
      return [];
    }
  },

  getCumpleanosCelebrados: async (): Promise<CelebracionCumpleanos[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'celebraciones_cumpleanos'));
      return snapshot.docs.map(doc => doc.data() as CelebracionCumpleanos);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'celebraciones_cumpleanos');
      return [];
    }
  },
  
  getDevocionales: async (): Promise<Devocional[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'devocionales'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Devocional));
    } catch (e) { 
        handleFirestoreError(e, OperationType.LIST, 'devocionales');
        return []; 
    }
  },

  getEntregasDevocionales: async (): Promise<EntregaDevocional[]> => {
    try {
        const snapshot = await getDocs(collection(db, 'entregas_devocionales'));
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as EntregaDevocional));
    } catch (e) { 
        handleFirestoreError(e, OperationType.LIST, 'entregas_devocionales');
        return []; 
    }
  },

  createDevocional: async (d: Omit<Devocional, 'id'>): Promise<Devocional> => {
    try {
        const docRef = await addDoc(collection(db, 'devocionales'), d);
        return { id: docRef.id, ...d };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'devocionales');
        throw error;
    }
  },

  updateDevocional: async (d: Devocional): Promise<Devocional> => {
    try {
        const { id, ...rest } = d;
        await updateDoc(doc(db, 'devocionales', id), rest as any);
        return d;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'devocionales');
        throw error;
    }
  },

  deleteDevocional: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'devocionales', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'devocionales');
    }
  },
  
  registrarEntregasBulk: async (entregas: Omit<EntregaDevocional, 'id'>[]): Promise<void> => {
    try {
      for (let i = 0; i < entregas.length; i += 400) {
        const chunk = entregas.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(e => {
          const docRef = doc(collection(db, 'entregas_devocionales'));
          batch.set(docRef, e);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'entregas_devocionales');
      throw error;
    }
  },

  deleteEntrega: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'entregas_devocionales', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'entregas_devocionales');
    }
  },
  
  updateEntregaDevocional: async (entrega: EntregaDevocional): Promise<void> => {
    try {
        const { id, ...rest } = entrega;
        await updateDoc(doc(db, 'entregas_devocionales', id), rest as any);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'entregas_devocionales');
        throw error;
    }
  },

  createAdolescente: async (adolescente: Omit<Adolescente, 'id'>): Promise<Adolescente> => {
    try {
        const docRef = await addDoc(collection(db, 'adolescentes'), adolescente);
        return { ...adolescente, id: docRef.id };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'adolescentes');
        throw error;
    }
  },

  updateAdolescente: async (adolescente: Adolescente): Promise<Adolescente> => {
    try {
        const { id, ...rest } = adolescente;
        await updateDoc(doc(db, 'adolescentes', id), rest as any);
        return adolescente;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'adolescentes');
        throw error;
    }
  },

  deleteAdolescente: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'adolescentes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'adolescentes');
    }
  },

  createAdolescentesBulk: async (adolescentes: Omit<Adolescente, 'id'>[]): Promise<void> => {
    try {
      for (let i = 0; i < adolescentes.length; i += 400) {
        const chunk = adolescentes.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(a => {
          const docRef = doc(collection(db, 'adolescentes'));
          batch.set(docRef, a);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'adolescentes');
      throw error;
    }
  },

  createEncargado: async (encargado: Omit<Encargado, 'id'>): Promise<Encargado> => {
    try {
        const docRef = await addDoc(collection(db, 'encargados'), encargado);
        return { ...encargado, id: docRef.id };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'encargados');
        throw error;
    }
  },

  updateEncargado: async (encargado: Encargado): Promise<Encargado> => {
    try {
        const { id, ...rest } = encargado;
        await updateDoc(doc(db, 'encargados', id), rest as any);
        return encargado;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'encargados');
        throw error;
    }
  },

  deleteEncargado: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'encargados', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'encargados');
    }
  },

  createEncargadosBulk: async (encargados: Omit<Encargado, 'id'>[]): Promise<void> => {
    try {
      for (let i = 0; i < encargados.length; i += 400) {
        const chunk = encargados.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(e => {
          const docRef = doc(collection(db, 'encargados'));
          batch.set(docRef, e);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'encargados');
      throw error;
    }
  },

  createReunion: async (reunion: Omit<Reunion, 'id'>): Promise<Reunion> => {
    try {
        const docRef = await addDoc(collection(db, 'reuniones'), reunion);
        return { ...reunion, id: docRef.id };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'reuniones');
        throw error;
    }
  },

  updateReunion: async (reunion: Reunion): Promise<Reunion> => {
    try {
        const { id, ...rest } = reunion;
        await updateDoc(doc(db, 'reuniones', id), rest as any);
        return reunion;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'reuniones');
        throw error;
    }
  },

  deleteReunion: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'reuniones', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'reuniones');
    }
  },

  createReunionesBulk: async (reuniones: Omit<Reunion, 'id'>[]): Promise<void> => {
    try {
      for (let i = 0; i < reuniones.length; i += 400) {
        const chunk = reuniones.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(r => {
          const docRef = doc(collection(db, 'reuniones'));
          batch.set(docRef, r);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reuniones');
      throw error;
    }
  },

  saveAsistencias: async (nuevasAsistencias: Asistencia[]): Promise<void> => {
    try {
      for (let i = 0; i < nuevasAsistencias.length; i += 400) {
        const chunk = nuevasAsistencias.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(a => {
          const docId = `${a.reunionId}_${a.adolescenteId}`;
          const docRef = doc(db, 'asistencias', docId);
          batch.set(docRef, a);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'asistencias');
      throw error;
    }
  },

  createTutor: async (tutor: Omit<Tutor, 'id'>): Promise<Tutor> => {
    try {
        const docRef = await addDoc(collection(db, 'tutores'), tutor);
        return { ...tutor, id: docRef.id };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'tutores');
        throw error;
    }
  },

  updateTutor: async (tutor: Tutor): Promise<Tutor> => {
    try {
        const { id, ...rest } = tutor;
        await updateDoc(doc(db, 'tutores', id), rest as any);
        return tutor;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'tutores');
        throw error;
    }
  },

  deleteTutor: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'tutores', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tutores');
    }
  },

  setTutorAdolescenteLinks: async (tutorId: string, adolescenteIds: string[]): Promise<void> => {
    try {
      const q = query(collection(db, 'tutor_adolescente'), where('tutorId', '==', tutorId));
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      adolescenteIds.forEach(aId => {
        const docRef = doc(collection(db, 'tutor_adolescente'));
        batch.set(docRef, { tutorId, adolescenteId: aId });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tutor_adolescente');
    }
  },

  createTutoresAndLinkBulk: async (tutores: any[]): Promise<void> => {
    // Simplified for migration, real implementation would need to match cedulas
    console.warn("createTutoresAndLinkBulk not fully implemented for Firebase migration yet");
  },
  
  setupFirstAdmin: async (usuario: any): Promise<void> => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.email)) {
      throw new Error("El formato del correo electrónico no es válido.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, usuario.email, usuario.password);
      const user = userCredential.user;
      
      await api.ensureDefaultRoles();
      
      await setDoc(doc(db, 'usuarios', user.uid), {
        email: usuario.email,
        nombre: usuario.nombre,
        rolId: usuario.rolId
      });
      
      await setDoc(doc(db, 'public', 'config'), {
        isInitialized: true
      });
    } catch (error: any) {
      if (error.code && error.code.startsWith('auth/')) {
        throw new Error(error.message);
      }
      handleFirestoreError(error, OperationType.CREATE, 'usuarios');
    }
  },

  createUsuario: async (usuario: any): Promise<Usuario> => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.email)) {
      throw new Error("El formato del correo electrónico no es válido.");
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, usuario.email, usuario.password);
      const user = userCredential.user;
      
      const newUser = {
        email: usuario.email,
        nombre: usuario.nombre,
        rolId: usuario.rolId
      };
      
      await setDoc(doc(db, 'usuarios', user.uid), newUser);
      return { id: user.uid, ...newUser } as Usuario;
    } catch (error: any) {
      if (error.code && error.code.startsWith('auth/')) {
        throw new Error(error.message);
      }
      handleFirestoreError(error, OperationType.CREATE, 'usuarios');
      throw error;
    }
  },

  updateUsuario: async (usuario: Usuario): Promise<Usuario> => {
    try {
        const { id, ...rest } = usuario;
        await updateDoc(doc(db, 'usuarios', id), rest as any);
        return usuario;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'usuarios');
        throw error;
    }
  },

  deleteUsuario: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'usuarios', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'usuarios');
    }
  },

  createRole: async (role: Omit<Rol, 'id'>): Promise<Rol> => {
    try {
        const docRef = await addDoc(collection(db, 'roles'), role);
        return normalizeRol({ id: docRef.id, ...role });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'roles');
        throw error;
    }
  },

  updateRole: async (role: Rol): Promise<Rol> => {
    try {
        const { id, ...rest } = role;
        await updateDoc(doc(db, 'roles', id), rest as any);
        return normalizeRol(role);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'roles');
        throw error;
    }
  },

  deleteRole: async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
      await deleteDoc(doc(db, 'roles', id));
      return { success: true };
    } catch (error) {
      return { success: false, message: 'El rol está en uso.' };
    }
  },

  createEvento: async (evento: Omit<Evento, 'id'>): Promise<Evento> => {
    try {
        const docRef = await addDoc(collection(db, 'eventos'), evento);
        return { ...evento, id: docRef.id };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'eventos');
        throw error;
    }
  },

  updateEvento: async (evento: Evento): Promise<Evento> => {
    try {
        const { id, ...rest } = evento;
        await updateDoc(doc(db, 'eventos', id), rest as any);
        return evento;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'eventos');
        throw error;
    }
  },

  deleteEvento: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'eventos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'eventos');
    }
  },

  createPago: async (p: Omit<PagoEvento, 'id'>): Promise<PagoEvento> => {
    try {
        const docRef = await addDoc(collection(db, 'pagos_eventos'), p);
        return { id: docRef.id, ...p };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'pagos_eventos');
        throw error;
    }
  },

  deletePago: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'pagos_eventos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'pagos_eventos');
    }
  },

  createInscripcion: async (i: Omit<InscripcionEvento, 'id'>): Promise<InscripcionEvento> => {
    try {
        const docRef = await addDoc(collection(db, 'inscripciones_eventos'), i);
        return { id: docRef.id, ...i };
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'inscripciones_eventos');
        throw error;
    }
  },

  updateInscripcion: async (i: InscripcionEvento): Promise<InscripcionEvento> => {
    try {
        const { id, ...rest } = i;
        await updateDoc(doc(db, 'inscripciones_eventos', id), rest as any);
        return i;
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'inscripciones_eventos');
        throw error;
    }
  },

  updateInscripcionesBulk: async (inscripciones: InscripcionEvento[]): Promise<void> => {
    try {
      for (let i = 0; i < inscripciones.length; i += 400) {
        const chunk = inscripciones.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const { id, ...rest } = item;
          batch.update(doc(db, 'inscripciones_eventos', id), rest as any);
        });
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'inscripciones_eventos');
      throw error;
    }
  },

  deleteInscripcion: async (id: string): Promise<void> => { 
    try {
      await deleteDoc(doc(db, 'inscripciones_eventos', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'inscripciones_eventos');
    }
  },

  addParticipante: async (p: ParticipanteEvento): Promise<ParticipanteEvento> => {
    try {
        await addDoc(collection(db, 'participantes_eventos'), p);
        return p;
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'participantes_eventos');
        throw error;
    }
  },

  removeParticipante: async (eId: string, aId: string): Promise<void> => { 
    try {
      const q = query(collection(db, 'participantes_eventos'), where('eventoId', '==', eId), where('adolescenteId', '==', aId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'participantes_eventos');
    }
  },
  
  addCumpleanosCelebrado: async (c: CelebracionCumpleanos): Promise<CelebracionCumpleanos> => {
    try {
        const docId = `${c.adolescenteId}_${c.ano}`;
        await setDoc(doc(db, 'celebraciones_cumpleanos', docId), c);
        return c;
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'celebraciones_cumpleanos');
        throw error;
    }
  },
  
  clearTable: async (table: string): Promise<void> => { 
    try {
      const snapshot = await getDocs(collection(db, table));
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, table);
    }
  },
  
  createUserProfile: async (profile: Usuario): Promise<Usuario> => { return api.createUsuario(profile); },
};
