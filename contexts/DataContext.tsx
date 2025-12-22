
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Changed Entrega to EntregaDevocional to match types.ts
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
    try {
      const [
        ados, encs, reus, devs, ents, asis, tuts, evs, usrs, rls, ta, ins, pgs, parts, cels
      ] = await Promise.all([
        api.getAdolescentes(), api.getEncargados(), api.getReuniones(),
        api.getDevocionales(), api.getEntregasDevocionales(), api.getAsistencias(),
        api.getTutores(), api.getEventos(), api.getUsuarios(), api.getRoles(),
        api.getTutorAdolescente(), api.getInscripciones(), api.getPagos(),
        api.getParticipantes(), api.getCumpleanosCelebrados()
      ]);
      setAdolescentes(ados);
      setEncargados(encs);
      setReuniones(reus);
      setDevocionales(devs);
      setEntregasDevocionales(ents);
      setAsistencias(asis);
      setTutores(tuts);
      setEventos(evs);
      setUsuarios(usrs);
      setRoles(rls);
      setTutoresAdolescentes(ta);
      setInscripciones(ins);
      setPagos(pgs);
      setParticipantes(parts);
      setCelebraciones(cels);
    } catch (e) {
      console.error("Error fetching data", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // CRUD Implementations
  const addAdolescente = async (a: Omit<Adolescente, 'id'>) => { await api.createAdolescente(a); await fetchData(); };
  const updateAdolescente = async (a: Adolescente) => { await api.updateAdolescente(a); await fetchData(); };
  const deleteAdolescente = async (id: number) => { await api.deleteAdolescente(id); await fetchData(); };
  const addAdolescentesBulk = async (a: Omit<Adolescente, 'id'>[]) => { await api.createAdolescentesBulk(a); await fetchData(); };

  const addEncargado = async (e: Omit<Encargado, 'id'>) => { await api.createEncargado(e); await fetchData(); };
  const updateEncargado = async (e: Encargado) => { await api.updateEncargado(e); await fetchData(); };
  const deleteEncargado = async (id: number) => { await api.deleteEncargado(id); await fetchData(); };
  const addEncargadosBulk = async (e: Omit<Encargado, 'id'>[]) => { await api.createEncargadosBulk(e); await fetchData(); };

  const addReunion = async (r: Omit<Reunion, 'id'>) => { await api.createReunion(r); await fetchData(); };
  const updateReunion = async (r: Reunion) => { await api.updateReunion(r); await fetchData(); };
  const deleteReunion = async (id: number) => { await api.deleteReunion(id); await fetchData(); };
  const addReunionesBulk = async (r: any[]) => { await api.createReunionesBulk(r); await fetchData(); };

  const saveAsistencias = async (a: Asistencia[]) => { await api.saveAsistencias(a); await fetchData(); };

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
  const deleteTutor = async (id: number) => { await api.deleteTutor(id); await fetchData(); };
  const addTutoresAndLinkBulk = async (t: any[]) => { await api.createTutoresAndLinkBulk(t); await fetchData(); };

  const addEvento = async (e: Omit<Evento, 'id'>) => { await api.createEvento(e); await fetchData(); };
  const updateEvento = async (e: Evento) => { await api.updateEvento(e); await fetchData(); };
  const deleteEvento = async (id: number) => { await api.deleteEvento(id); await fetchData(); };

  const addInscripcion = async (eId: number, aId: number) => { 
    await api.createInscripcion({ eventoId: eId, adolescenteId: aId, fechaInscripcion: new Date().toISOString().split('T')[0] }); 
    await fetchData(); 
  };
  const updateInscripcion = async (i: InscripcionEvento) => { await api.updateInscripcion(i); await fetchData(); };
  const deleteInscripcion = async (id: number) => { await api.deleteInscripcion(id); await fetchData(); };

  const addPago = async (iId: number, m: number) => { 
    await api.createPago({ inscripcionId: iId, monto: m, fecha: new Date().toISOString().split('T')[0] }); 
    await fetchData(); 
  };
  const deletePago = async (id: number) => { await api.deletePago(id); await fetchData(); };

  const addParticipante = async (eId: number, aId: number) => { await api.addParticipante({ eventoId: eId, adolescenteId: aId }); await fetchData(); };
  const removeParticipante = async (eId: number, aId: number) => { await api.removeParticipante(eId, aId); await fetchData(); };

  const addCelebracionCumpleanos = async (aId: number, ano: number) => { await api.addCumpleanosCelebrado({ adolescenteId: aId, ano }); await fetchData(); };

  const addUser = async (u: any) => { await api.createUsuario(u); await fetchData(); };
  const updateUser = async (u: Usuario) => { await api.updateUsuario(u); await fetchData(); };
  const deleteUser = async (id: string) => { await api.deleteUsuario(id); await fetchData(); };
  const sendPasswordReset = async (email: string) => { await api.resetPasswordForEmail(email); };

  const addRole = async (r: Omit<Rol, 'id'>) => { await api.createRole(r); await fetchData(); };
  const updateRole = async (r: Rol) => { await api.updateRole(r); await fetchData(); };
  const deleteRole = async (id: number) => { const res = await api.deleteRole(id); await fetchData(); return res; };

  const addDevocional = async (d: Omit<Devocional, 'id'>) => { await api.createDevocional(d); await fetchData(); };
  const updateDevocional = async (d: Devocional) => { await api.updateDevocional(d); await fetchData(); };
  const deleteDevocional = async (id: number) => { await api.deleteDevocional(id); await fetchData(); };
  const registrarEntregaBulk = async (e: Omit<EntregaDevocional, 'id'>[]) => { await api.registrarEntregasBulk(e); await fetchData(); };
  const updateEntrega = async (e: EntregaDevocional) => { await api.updateEntregaDevocional(e); await fetchData(); };
  const deleteEntrega = async (id: number) => { await api.deleteEntrega(id); await fetchData(); };

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
