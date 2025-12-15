import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { Adolescente, Encargado, Reunion, Tutor, Evento, Asistencia, TutorAdolescente, InscripcionEvento, PagoEvento, ParticipanteEvento, CelebracionCumpleanos, Usuario, Rol, TipoAsistencia, AsistenciaDetalle, ResumenReunion } from '../types';
import { api } from '../services/api';

type ClearableTable = 'adolescentes' | 'encargados' | 'reuniones' | 'tutores' | 'eventos';

interface DataContextType {
  adolescentes: Adolescente[];
  encargados: Encargado[];
  reuniones: Reunion[];
  tutores: Tutor[];
  eventos: Evento[];
  asistencias: Asistencia[];
  tutoresAdolescentes: TutorAdolescente[];
  inscripciones: InscripcionEvento[];
  pagos: PagoEvento[];
  participantes: ParticipanteEvento[];
  celebraciones: CelebracionCumpleanos[];
  usuarios: Usuario[];
  roles: Rol[];
  resumenReuniones: ResumenReunion[];
  fetchData: () => Promise<void>;
  
  addAdolescente: (adolescente: Omit<Adolescente, 'id'>) => Promise<void>;
  updateAdolescente: (adolescente: Adolescente) => Promise<void>;
  deleteAdolescente: (id: number) => Promise<void>;
  addAdolescentesBulk: (adolescentes: Omit<Adolescente, 'id'>[]) => Promise<void>;

  addUser: (usuario: Omit<Usuario, 'id'> & { id?: string; password?: string }) => Promise<void>;
  updateUser: (usuario: Usuario) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;

  addEncargado: (encargado: Omit<Encargado, 'id'>) => Promise<void>;
  updateEncargado: (encargado: Encargado) => Promise<void>;
  deleteEncargado: (id: number) => Promise<void>;
  addEncargadosBulk: (encargados: Omit<Encargado, 'id'>[]) => Promise<void>;

  addReunion: (reunion: Omit<Reunion, 'id'>) => Promise<void>;
  updateReunion: (reunion: Reunion) => Promise<void>;
  deleteReunion: (id: number) => Promise<void>;
  addReunionesBulk: (reuniones: (Omit<Reunion, 'id' | 'encargadoId'> & { encargadoCedula: string })[]) => Promise<void>;
  
  saveAsistencias: (asistencias: Asistencia[]) => Promise<void>;
  addAsistenciasBulk: (asistencias: { reunionFecha: string; reunionTema: string; adolescenteCedula: string; estado: TipoAsistencia; detalle?: AsistenciaDetalle }[]) => Promise<void>;

  addTutor: (tutor: Omit<Tutor, 'id'>, adolescenteIds: number[]) => Promise<void>;
  updateTutor: (tutor: Tutor, adolescenteIds: number[]) => Promise<void>;
  deleteTutor: (id: number) => Promise<void>;
  addTutoresAndLinkBulk: (tutores: (Omit<Tutor, 'id'> & { adolescenteCedulas: string })[]) => Promise<void>;

  // Roles
  addRole: (role: Omit<Rol, 'id'>) => Promise<void>;
  updateRole: (role: Rol) => Promise<void>;
  deleteRole: (id: number) => Promise<{ success: boolean; message?: string }>;

  // Eventos related
  addEvento: (evento: Omit<Evento, 'id'>) => Promise<void>;
  updateEvento: (evento: Evento) => Promise<void>;
  deleteEvento: (id: number) => Promise<void>;
  addInscripcion: (eventoId: number, adolescenteId: number) => Promise<void>;
  updateInscripcion: (inscripcion: InscripcionEvento) => Promise<void>;
  deleteInscripcion: (inscripcionId: number) => Promise<void>;
  addPago: (inscripcionId: number, monto: number) => Promise<void>;
  deletePago: (pagoId: number) => Promise<void>;
  addParticipante: (eventoId: number, adolescenteId: number) => Promise<void>;
  removeParticipante: (eventoId: number, adolescenteId: number) => Promise<void>;
  
  // Cumpleaños
  addCelebracionCumpleanos: (adolescenteId: number, ano: number) => Promise<void>;

  // Data Management
  clearTable: (tableName: ClearableTable) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [adolescentes, setAdolescentes] = useState<Adolescente[]>([]);
  const [encargados, setEncargados] = useState<Encargado[]>([]);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [tutoresAdolescentes, setTutoresAdolescentes] = useState<TutorAdolescente[]>([]);
  const [inscripciones, setInscripciones] = useState<InscripcionEvento[]>([]);
  const [pagos, setPagos] = useState<PagoEvento[]>([]);
  const [participantes, setParticipantes] = useState<ParticipanteEvento[]>([]);
  const [celebraciones, setCelebraciones] = useState<CelebracionCumpleanos[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [resumenReuniones, setResumenReuniones] = useState<ResumenReunion[]>([]);


  const fetchData = useCallback(async () => {
    try {
        const results = await Promise.allSettled([
          api.getAdolescentes(),
          api.getEncargados(),
          api.getReuniones(),
          api.getTutores(),
          api.getEventos(),
          api.getAsistencias(),
          api.getTutorAdolescente(),
          api.getInscripciones(),
          api.getPagos(),
          api.getParticipantes(),
          api.getCumpleanosCelebrados(),
          api.getUsuarios(),
          api.getRoles(),
          api.getResumenReuniones(),
        ]);

        const [
          adolescentesRes,
          encargadosRes,
          reunionesRes,
          tutoresRes,
          eventosRes,
          asistenciasRes,
          tutoresAdolescentesRes,
          inscripcionesRes,
          pagosRes,
          participantesRes,
          celebracionesRes,
          usuariosRes,
          rolesRes,
          resumenReunionesRes,
        ] = results;

        // Helper to extract error message safely
        const getErrorMessage = (reason: any) => {
             if (reason instanceof Error) return reason.message;
             if (typeof reason === 'string') return reason;
             return JSON.stringify(reason);
        };

        if (adolescentesRes.status === 'fulfilled') setAdolescentes(adolescentesRes.value);
        else console.error("Error fetching Adolescentes:", getErrorMessage(adolescentesRes.reason));

        if (encargadosRes.status === 'fulfilled') setEncargados(encargadosRes.value);
        else console.error("Error fetching Encargados:", getErrorMessage(encargadosRes.reason));

        if (reunionesRes.status === 'fulfilled') setReuniones(reunionesRes.value);
        else console.error("Error fetching Reuniones:", getErrorMessage(reunionesRes.reason));

        if (tutoresRes.status === 'fulfilled') setTutores(tutoresRes.value);
        else console.error("Error fetching Tutores:", getErrorMessage(tutoresRes.reason));

        if (eventosRes.status === 'fulfilled') setEventos(eventosRes.value);
        else console.error("Error fetching Eventos:", getErrorMessage(eventosRes.reason));

        if (asistenciasRes.status === 'fulfilled') setAsistencias(asistenciasRes.value);
        else console.error("Error fetching Asistencias:", getErrorMessage(asistenciasRes.reason));

        if (tutoresAdolescentesRes.status === 'fulfilled') setTutoresAdolescentes(tutoresAdolescentesRes.value);
        else console.error("Error fetching Tutor-Adolescente links:", getErrorMessage(tutoresAdolescentesRes.reason));

        if (inscripcionesRes.status === 'fulfilled') setInscripciones(inscripcionesRes.value);
        else console.error("Error fetching Inscripciones:", getErrorMessage(inscripcionesRes.reason));

        if (pagosRes.status === 'fulfilled') setPagos(pagosRes.value);
        else console.error("Error fetching Pagos:", getErrorMessage(pagosRes.reason));

        if (participantesRes.status === 'fulfilled') setParticipantes(participantesRes.value);
        else console.error("Error fetching Participantes:", getErrorMessage(participantesRes.reason));

        if (celebracionesRes.status === 'fulfilled') setCelebraciones(celebracionesRes.value);
        else console.error("Error fetching Celebraciones:", getErrorMessage(celebracionesRes.reason));

        if (usuariosRes.status === 'fulfilled') setUsuarios(usuariosRes.value);
        else console.error("Error fetching Usuarios:", getErrorMessage(usuariosRes.reason));

        if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value);
        else console.error("Error fetching Roles:", getErrorMessage(rolesRes.reason));

        if (resumenReunionesRes.status === 'fulfilled') setResumenReuniones(resumenReunionesRes.value);
        else console.error("Error fetching Resumen Reuniones:", getErrorMessage(resumenReunionesRes.reason));

    } catch (error) {
        console.error("Critical error in fetchData:", error);
    }
  }, []);

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [fetchData, user]);

  const addAdolescente = async (adolescente: Omit<Adolescente, 'id'>) => {
    await api.createAdolescente(adolescente);
    await fetchData();
  };
  
  const addAdolescentesBulk = async (adolescentes: Omit<Adolescente, 'id'>[]) => {
    await api.createAdolescentesBulk(adolescentes);
    await fetchData();
  };

  const updateAdolescente = async (adolescente: Adolescente) => {
    await api.updateAdolescente(adolescente);
    await fetchData();
  };

  const deleteAdolescente = async (id: number) => {
    await api.deleteAdolescente(id);
    await fetchData();
  };

  const addUser = async (usuario: Omit<Usuario, 'id'> & { id?: string; password?: string }) => {
    await api.createUsuario(usuario);
    await fetchData();
  };

  const updateUser = async (usuario: Usuario) => {
    await api.updateUsuario(usuario);
    await fetchData();
  };

  const deleteUser = async (id: string) => {
    await api.deleteUsuario(id);
    await fetchData();
  };
  
  const sendPasswordReset = async (email: string) => {
    await api.resetPasswordForEmail(email);
  }

  const addEncargado = async (encargado: Omit<Encargado, 'id'>) => {
    await api.createEncargado(encargado);
    await fetchData();
  };

  const updateEncargado = async (encargado: Encargado) => {
    await api.updateEncargado(encargado);
    await fetchData();
  };

  const deleteEncargado = async (id: number) => {
    await api.deleteEncargado(id);
    await fetchData();
  };
  
  const addEncargadosBulk = async (encargados: Omit<Encargado, 'id'>[]) => {
    await api.createEncargadosBulk(encargados);
    await fetchData();
  };

  const addReunion = async (reunion: Omit<Reunion, 'id'>) => {
    await api.createReunion(reunion);
    await fetchData();
  };

  const updateReunion = async (reunion: Reunion) => {
    await api.updateReunion(reunion);
    await fetchData();
  };

  const deleteReunion = async (id: number) => {
    await api.deleteReunion(id);
    await fetchData();
  };

  const addReunionesBulk = async (reuniones: (Omit<Reunion, 'id' | 'encargadoId'> & { encargadoCedula: string })[]) => {
    await api.createReunionesBulk(reuniones);
    await fetchData();
  };

  const saveAsistencias = async (nuevasAsistencias: Asistencia[]) => {
    await api.saveAsistencias(nuevasAsistencias);
    await fetchData();
  }

  const addAsistenciasBulk = async (asistencias: { reunionFecha: string; reunionTema: string; adolescenteCedula: string; estado: TipoAsistencia; detalle?: AsistenciaDetalle }[]) => {
    await api.saveAsistenciasBulk(asistencias);
    await fetchData();
  };
  
  const addTutor = async (tutor: Omit<Tutor, 'id'>, adolescenteIds: number[]) => {
    const newTutor = await api.createTutor(tutor);
    await api.setTutorAdolescenteLinks(newTutor.id, adolescenteIds);
    await fetchData();
  };

  const updateTutor = async (tutor: Tutor, adolescenteIds: number[]) => {
    await api.updateTutor(tutor);
    await api.setTutorAdolescenteLinks(tutor.id, adolescenteIds);
    await fetchData();
  };

  const deleteTutor = async (id: number) => {
    await api.deleteTutor(id);
    await fetchData();
  };

  const addTutoresAndLinkBulk = async (tutores: (Omit<Tutor, 'id'> & { adolescenteCedulas: string })[]) => {
    await api.createTutoresAndLinkBulk(tutores);
    await fetchData();
  };

  // Roles methods
  const addRole = async (role: Omit<Rol, 'id'>) => {
    await api.createRole(role);
    await fetchData();
  };
  
  const updateRole = async (role: Rol) => {
    await api.updateRole(role);
    await fetchData();
  };

  const deleteRole = async (id: number) => {
    const result = await api.deleteRole(id);
    if (result.success) {
        await fetchData();
    }
    return result;
  };

  // Eventos methods
  const addEvento = async (evento: Omit<Evento, 'id'>) => {
    await api.createEvento(evento);
    await fetchData();
  };

  const updateEvento = async (evento: Evento) => {
    await api.updateEvento(evento);
    await fetchData();
  };

  const deleteEvento = async (id: number) => {
    await api.deleteEvento(id);
    await fetchData();
  };

  const addInscripcion = async (eventoId: number, adolescenteId: number) => {
    await api.createInscripcion({ eventoId, adolescenteId, fechaInscripcion: new Date().toISOString().split('T')[0], notas: '' });
    await fetchData();
  };
  
  const updateInscripcion = async (inscripcion: InscripcionEvento) => {
    await api.updateInscripcion(inscripcion);
    await fetchData();
  };

  const deleteInscripcion = async (inscripcionId: number) => {
    await api.deleteInscripcion(inscripcionId);
    await fetchData();
  };

  const addPago = async (inscripcionId: number, monto: number) => {
    await api.createPago({ inscripcionId, monto, fecha: new Date().toISOString().split('T')[0] });
    await fetchData();
  };

  const deletePago = async (pagoId: number) => {
    await api.deletePago(pagoId);
    await fetchData();
  };

  const addParticipante = async (eventoId: number, adolescenteId: number) => {
    await api.addParticipante({ eventoId, adolescenteId });
    await fetchData();
  };
  
  const removeParticipante = async (eventoId: number, adolescenteId: number) => {
    await api.removeParticipante(eventoId, adolescenteId);
    await fetchData();
  };

  const addCelebracionCumpleanos = async (adolescenteId: number, ano: number) => {
    await api.addCumpleanosCelebrado({ adolescenteId, ano });
    await fetchData();
  };

  // Data Management methods
  const clearTable = async (tableName: ClearableTable) => {
    await api.clearTable(tableName);
    await fetchData();
  };

  return (
    <DataContext.Provider value={{ 
      adolescentes, encargados, reuniones, tutores, eventos, asistencias, 
      tutoresAdolescentes, inscripciones, pagos, participantes, celebraciones, usuarios, roles, resumenReuniones, fetchData,
      addAdolescente, updateAdolescente, deleteAdolescente, addAdolescentesBulk,
      addUser, updateUser, deleteUser, sendPasswordReset,
      addEncargado, updateEncargado, deleteEncargado, addEncargadosBulk,
      addReunion, updateReunion, deleteReunion, saveAsistencias, addReunionesBulk, addAsistenciasBulk,
      addTutor, updateTutor, deleteTutor, addTutoresAndLinkBulk,
      addRole, updateRole, deleteRole,
      addEvento, updateEvento, deleteEvento,
      addInscripcion, updateInscripcion, deleteInscripcion, addPago, deletePago, addParticipante, removeParticipante,
      addCelebracionCumpleanos,
      clearTable
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};