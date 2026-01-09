
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Adolescente, Encargado, Devocional, EntregaDevocional, Reunion, 
  Asistencia, Tutor, Evento, Usuario, Rol, TutorAdolescente,
  InscripcionEvento, PagoEvento, ParticipanteEvento, CelebracionCumpleanos
} from '../types';
import { api } from '../services/api';

interface DataContextType {
  adolescentes: Adolescente[];
  encargados: Encargado[];
  reuniones: Reunion[];
  devocionales: Devocional[];
  entregasDevocionales: EntregaDevocional[];
  asistencias: Asistencia[];
  tutores: Tutor[];
  eventos: Evento[];
  usuarios: Usuario[];
  roles: Rol[];
  tutoresAdolescentes: TutorAdolescente[];
  inscripciones: InscripcionEvento[];
  pagos: PagoEvento[];
  participantes: ParticipanteEvento[];
  celebraciones: CelebracionCumpleanos[];
  
  fetchData: () => Promise<void>;
  addAdolescente: (a: Omit<Adolescente, 'id'>) => Promise<void>;
  updateAdolescente: (a: Adolescente) => Promise<void>;
  deleteAdolescente: (id: number) => Promise<void>;
  addAdolescentesBulk: (a: Omit<Adolescente, 'id'>[]) => Promise<void>;
  
  addEncargado: (e: Omit<Encargado, 'id'>) => Promise<void>;
  updateEncargado: (e: Encargado) => Promise<void>;
  deleteEncargado: (id: number) => Promise<void>;
  addEncargadosBulk: (e: Omit<Encargado, 'id'>[]) => Promise<void>;
  
  addReunion: (r: Omit<Reunion, 'id'>) => Promise<void>;
  updateReunion: (r: Reunion) => Promise<void>;
  deleteReunion: (id: number) => Promise<void>;
  addReunionesBulk: (r: any[]) => Promise<void>;
  
  saveAsistencias: (a: Asistencia[]) => Promise<void>;
  
  addTutor: (t: Omit<Tutor, 'id'>, adolescentIds: number[]) => Promise<void>;
  updateTutor: (t: Tutor, adolescentIds: number[]) => Promise<void>;
  deleteTutor: (id: number) => Promise<void>;
  addTutoresAndLinkBulk: (t: any[]) => Promise<void>;
  
  addEvento: (e: Omit<Evento, 'id'>) => Promise<void>;
  updateEvento: (e: Evento) => Promise<void>;
  deleteEvento: (id: number) => Promise<void>;
  
  addInscripcion: (eId: number, aId: number) => Promise<void>;
  updateInscripcion: (i: InscripcionEvento) => Promise<void>;
  deleteInscripcion: (id: number) => Promise<void>;
  
  addPago: (iId: number, m: number) => Promise<void>;
  deletePago: (id: number) => Promise<void>;
  
  addParticipante: (eId: number, aId: number) => Promise<void>;
  removeParticipante: (eId: number, aId: number) => Promise<void>;
  
  addCelebracionCumpleanos: (aId: number, ano: number) => Promise<void>;
  
  addUser: (u: any) => Promise<void>;
  updateUser: (u: Usuario) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  
  addRole: (r: Omit<Rol, 'id'>) => Promise<void>;
  updateRole: (r: Rol) => Promise<void>;
  deleteRole: (id: number) => Promise<{ success: boolean; message?: string }>;
  
  addDevocional: (d: Omit<Devocional, 'id'>) => Promise<void>;
  updateDevocional: (d: Devocional) => Promise<void>;
  deleteDevocional: (id: number) => Promise<void>;
  registrarEntregaBulk: (e: Omit<EntregaDevocional, 'id'>[]) => Promise<void>;
  updateEntrega: (e: EntregaDevocional) => Promise<void>;
  deleteEntrega: (id: number) => Promise<void>;
  
  clearTable: (table: any) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [devocionales, setDevocionales] = useState<Devocional[]>([]);
  const [entregasDevocionales, setEntregasDevocionales] = useState<EntregaDevocional[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [tutoresAdolescentes, setTutoresAdolescentes] = useState<TutorAdolescente[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionEvento[]>([]);
  const [pagos, setPagos] = useState<PagoEvento[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteEvento[]>([]);
  const [celebraciones, setCelebraciones] = useState<CelebracionCumpleanos[]>([]);

  const fetchData = useCallback(async () => {
    // Cargamos Adolescentes primero para asegurar que la lista principal aparezca rápido
    try {
        const ados = await api.getAdolescentes();
        setAdolescentes(ados);
    } catch (e) { console.error("Error loading adolescents", e); }

    // El resto de las tablas se cargan de forma independiente para no bloquearse entre sí
    const loaders = [
        { fn: api.getEncargados, set: setEncargados },
        { fn: api.getReuniones, set: setReuniones },
        { fn: api.getDevocionales, set: setDevocionales },
        { fn: api.getEntregasDevocionales, set: setEntregasDevocionales },
        { fn: api.getAsistencias, set: setAsistencias },
        { fn: api.getTutores, set: setTutores },
        { fn: api.getEventos, set: setEventos },
        { fn: api.getUsuarios, set: setUsuarios },
        { fn: api.getRoles, set: setRoles },
        { fn: api.getTutorAdolescente, set: setTutoresAdolescentes },
        { fn: api.getInscripciones, set: setInscripciones },
        { fn: api.getPagos, set: setPagos },
        { fn: api.getParticipantes, set: setParticipantes },
        { fn: api.getCumpleanosCelebrados, set: setCelebraciones }
    ];

    loaders.forEach(async ({ fn, set }) => {
        try {
            const data = await fn();
            set(data as any);
        } catch (e) {
            console.warn(`Error loading table in background:`, e);
        }
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAdolescente = async (a: Omit<Adolescente, 'id'>) => { 
      const newAdo = await api.createAdolescente(a); 
      setAdolescentes(prev => [...prev, newAdo].sort((x, y) => x.nombre.localeCompare(y.nombre))); 
  };
  
  const updateAdolescente = async (a: Adolescente) => { 
      const updatedAdo = await api.updateAdolescente(a); 
      setAdolescentes(prev => prev.map(item => item.id === a.id ? updatedAdo : item));
      // NOTA: Eliminamos el setTimeout de fetchData aquí para evitar saturar la red justo tras un guardado.
      // Los datos locales ya se actualizaron arriba con setAdolescentes.
  };
  
  const deleteAdolescente = async (id: number) => { 
      await api.deleteAdolescente(id); 
      setAdolescentes(prev => prev.filter(item => item.id !== id)); 
  };
  
  const addAdolescentesBulk = async (a: Omit<Adolescente, 'id'>[]) => { 
      await api.createAdolescentesBulk(a); 
      const freshAdos = await api.getAdolescentes();
      setAdolescentes(freshAdos);
  };

  const addEncargado = async (e: Omit<Encargado, 'id'>) => { 
      const newEnc = await api.createEncargado(e); 
      setEncargados(prev => [...prev, newEnc]); 
  };
  
  const updateEncargado = async (e: Encargado) => { 
      const updatedEnc = await api.updateEncargado(e); 
      setEncargados(prev => prev.map(item => item.id === e.id ? updatedEnc : item)); 
  };
  
  const deleteEncargado = async (id: number) => { 
      await api.deleteEncargado(id); 
      setEncargados(prev => prev.filter(item => item.id !== id)); 
  };
  
  const addEncargadosBulk = async (e: Omit<Encargado, 'id'>[]) => { await api.createEncargadosBulk(e); await fetchData(); };

  const addReunion = async (r: Omit<Reunion, 'id'>) => { 
      const newReu = await api.createReunion(r); 
      setReuniones(prev => [newReu, ...prev]); 
  };
  
  const updateReunion = async (r: Reunion) => { 
      const updatedReu = await api.updateReunion(r); 
      setReuniones(prev => prev.map(item => item.id === r.id ? updatedReu : item)); 
  };
  
  const deleteReunion = async (id: number) => { 
      await api.deleteReunion(id); 
      setReuniones(prev => prev.filter(item => item.id !== id)); 
  };
  
  const addReunionesBulk = async (r: any[]) => { await api.createReunionesBulk(r); await fetchData(); };

  const saveAsistencias = async (a: Asistencia[]) => { 
      await api.saveAsistencias(a); 
      const freshAsis = await api.getAsistencias();
      setAsistencias(freshAsis);
  };

  const addTutor = async (t: Omit<Tutor, 'id'>, adolescentIds: number[]) => { 
    const nt = await api.createTutor(t); 
    await api.setTutorAdolescenteLinks(nt.id, adolescentIds);
    await fetchData(); 
  };
  const updateTutor = async (t: Tutor, adolescentIds: number[]) => { 
    await api.updateTutor(t); 
    await api.setTutorAdolescenteLinks(t.id, adolescentIds);
    await fetchData(); 
  };
  const deleteTutor = async (id: number) => { 
      await api.deleteTutor(id); 
      setTutores(prev => prev.filter(t => t.id !== id));
  };
  const addTutoresAndLinkBulk = async (t: any[]) => { await api.createTutoresAndLinkBulk(t); await fetchData(); };

  const addEvento = async (e: Omit<Evento, 'id'>) => { 
      const newEv = await api.createEvento(e); 
      setEventos(prev => [...prev, newEv]); 
  };
  const updateEvento = async (e: Evento) => { 
      const updatedEv = await api.updateEvento(e); 
      setEventos(prev => prev.map(item => item.id === e.id ? updatedEv : item)); 
  };
  const deleteEvento = async (id: number) => { 
      await api.deleteEvento(id); 
      setEventos(prev => prev.filter(e => e.id !== id));
  };

  const addInscripcion = async (eId: number, aId: number) => { 
    await api.createInscripcion({ eventoId: eId, adolescenteId: aId, fechaInscripcion: new Date().toISOString().split('T')[0] }); 
    const freshIns = await api.getInscripciones();
    setInscripciones(freshIns);
  };
  const updateInscripcion = async (i: InscripcionEvento) => { 
      await api.updateInscripcion(i); 
      setInscripciones(prev => prev.map(item => item.id === i.id ? i : item));
  };
  const deleteInscripcion = async (id: number) => { 
      await api.deleteInscripcion(id); 
      setInscripciones(prev => prev.filter(i => i.id !== id));
  };

  const addPago = async (iId: number, m: number) => { 
    await api.createPago({ inscripcionId: iId, monto: m, fecha: new Date().toISOString().split('T')[0] }); 
    const freshPagos = await api.getPagos();
    setPagos(freshPagos);
  };
  const deletePago = async (id: number) => { 
      await api.deletePago(id); 
      setPagos(prev => prev.filter(p => p.id !== id));
  };

  const addParticipante = async (eId: number, aId: number) => { 
      await api.addParticipante({ eventoId: eId, adolescenteId: aId }); 
      setParticipantes(prev => [...prev, { eventoId: eId, adolescenteId: aId }]);
  };
  const removeParticipante = async (eId: number, aId: number) => { 
      await api.removeParticipante(eId, aId); 
      setParticipantes(prev => prev.filter(p => !(p.eventoId === eId && p.adolescenteId === aId)));
  };

  const addCelebracionCumpleanos = async (aId: number, ano: number) => { 
      await api.addCumpleanosCelebrado({ adolescenteId: aId, ano }); 
      setCelebraciones(prev => [...prev, { adolescenteId: aId, ano }]);
  };

  const addUser = async (u: any) => { await api.createUsuario(u); await fetchData(); };
  const updateUser = async (u: Usuario) => { await api.updateUsuario(u); await fetchData(); };
  const deleteUser = async (id: string) => { await api.deleteUsuario(id); await fetchData(); };
  const sendPasswordReset = async (email: string) => { await api.resetPasswordForEmail(email); };

  const addRole = async (r: Omit<Rol, 'id'>) => { await api.createRole(r); await fetchData(); };
  const updateRole = async (r: Rol) => { await api.updateRole(r); await fetchData(); };
  const deleteRole = async (id: number) => { const res = await api.deleteRole(id); await fetchData(); return res; };

  const addDevocional = async (d: Omit<Devocional, 'id'>) => { 
      const newDev = await api.createDevocional(d); 
      setDevocionales(prev => [...prev, newDev]); 
  };
  const updateDevocional = async (d: Devocional) => { 
      const updatedDev = await api.updateDevocional(d); 
      setDevocionales(prev => prev.map(item => item.id === d.id ? updatedDev : item)); 
  };
  const deleteDevocional = async (id: number) => { 
      await api.deleteDevocional(id); 
      setDevocionales(prev => prev.filter(d => d.id !== id));
  };
  const registrarEntregaBulk = async (e: Omit<EntregaDevocional, 'id'>[]) => { 
      await api.registrarEntregasBulk(e); 
      const freshEntregas = await api.getEntregasDevocionales();
      setEntregasDevocionales(freshEntregas);
  };
  const updateEntrega = async (e: EntregaDevocional) => { 
      await api.updateEntregaDevocional(e); 
      setEntregasDevocionales(prev => prev.map(item => item.id === e.id ? e : item));
  };
  const deleteEntrega = async (id: number) => { 
      await api.deleteEntrega(id); 
      setEntregasDevocionales(prev => prev.filter(e => e.id !== id));
  };

  const clearTable = async (table: any) => { await api.clearTable(table); await fetchData(); };

  return (
    <DataContext.Provider value={{
      adolescentes, encargados, reuniones, devocionales, entregasDevocionales, asistencias, tutores, eventos, usuarios, roles,
      tutoresAdolescentes, inscripciones, pagos, participantes, celebraciones,
      fetchData, addAdolescente, updateAdolescente, deleteAdolescente, addAdolescentesBulk,
      addEncargado, updateEncargado, deleteEncargado, addEncargadosBulk,
      addReunion, updateReunion, deleteReunion, addReunionesBulk, saveAsistencias,
      addTutor, updateTutor, deleteTutor, addTutoresAndLinkBulk,
      addEvento, updateEvento, deleteEvento,
      addInscripcion, updateInscripcion, deleteInscripcion,
      addPago, deletePago, addParticipante, removeParticipante,
      addCelebracionCumpleanos, addUser, updateUser, deleteUser, sendPasswordReset,
      addRole, updateRole, deleteRole,
      addDevocional, updateDevocional, deleteDevocional, registrarEntregaBulk, updateEntrega, deleteEntrega,
      clearTable
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
