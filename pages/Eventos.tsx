
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Evento, Adolescente, InscripcionEvento, PagoEvento, Servidor, InscripcionServidor, RolServidor, PagoServidor, TipoBeca } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { ChevronDownIcon, TrashIcon, UsersIcon, PencilIcon } from '../components/ui/Icons';

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <input {...props} id={props.name} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);

const CheckboxField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div className="flex items-center mt-4">
        <input {...props} id={props.name} type="checkbox" className="h-4 w-4 text-primary bg-background border-border rounded focus:ring-primary" />
        <label htmlFor={props.name} className="ml-2 block text-sm font-medium text-text-secondary">{label}</label>
    </div>
);

const Eventos: React.FC = () => {
    const { 
        eventos, adolescentes, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores,
        addEvento, updateEvento, deleteEvento,
        addInscripcion, deleteInscripcion, addPago, deletePago,
        addInscripcionServidor, updateInscripcionServidor, deleteInscripcionServidor, addPagoServidor, deletePagoServidor
    } = useData();
    const { hasPermission } = useAuth();
    
    const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
    const [activeTabModal, setActiveTabModal] = useState<'chicos' | 'servidores'>('chicos');
    
    // Server Enrollment State
    const [servidorToInscribe, setServidorToInscribe] = useState<string>('');
    const [rolServidorToInscribe, setRolServidorToInscribe] = useState<RolServidor>('Apoyo');
    const [becaServidorToInscribe, setBecaServidorToInscribe] = useState<TipoBeca>('Ninguna');
    const [montoServidorToInscribe, setMontoServidorToInscribe] = useState<string>('0');
    const [iglesiaPagaServidorToInscribe, setIglesiaPagaServidorToInscribe] = useState<boolean>(false);
    const [precioEspecialLocalToInscribe, setPrecioEspecialLocalToInscribe] = useState<boolean>(false);
    
    // Edit Enrollment State
    const [editingInscripcion, setEditingInscripcion] = useState<InscripcionServidor | null>(null);
    const [isEditInscripcionModalOpen, setIsEditInscripcionModalOpen] = useState(false);
    
    const [adolescenteToInscribe, setAdolescenteToInscribe] = useState<string>('');
    
    const [searchInscribedChico, setSearchInscribedChico] = useState('');
    const [searchInscribedServidor, setSearchInscribedServidor] = useState('');
    const [showOnlyBecados, setShowOnlyBecados] = useState(false);
    const [showOnlyDeudores, setShowOnlyDeudores] = useState(false);

    const [newPayment, setNewPayment] = useState<{ [key: number]: string }>({});
    const [newPaymentDate, setNewPaymentDate] = useState<{ [key: number]: string }>({});
    const [newPaymentServidor, setNewPaymentServidor] = useState<{ [key: number]: string }>({});
    const [newPaymentDateServidor, setNewPaymentDateServidor] = useState<{ [key: number]: string }>({});

    const [expandedHistory, setExpandedHistory] = useState<{ [key: string]: boolean }>({});
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<Evento | null>(null);

    const initialEventFormState: Omit<Evento, 'id'> = {
        tema: '', lugar: '', fechaInicio: '', horaInicio: '', fechaFin: '', horaFin: '',
        tieneCosto: false, costoTotal: 0, costoPersona: 0,
    };

    const { values, handleInputChange, setValues, resetForm } = useForm(initialEventFormState);

    const toggleHistory = (type: 'ado' | 'ser', id: number) => {
        const key = `${type}-${id}`;
        setExpandedHistory(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const openModalForCreate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingEvent(null);
        resetForm();
        setIsEventModalOpen(true);
    };

    const openModalForEdit = (e: React.MouseEvent, event: Evento) => {
        e.stopPropagation();
        setEditingEvent(event);
        setValues(event);
        setIsEventModalOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, event: Evento) => {
        e.stopPropagation();
        setEventToDelete(event);
        setIsDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (eventToDelete) {
            await deleteEvento(eventToDelete.id);
            setIsDeleteConfirmOpen(false);
            setEventToDelete(null);
        }
    };

    const handleEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...values };
        if (!payload.tieneCosto) {
            payload.costoTotal = 0;
            payload.costoPersona = 0;
        }
        if (editingEvent) {
            await updateEvento({ ...payload, id: editingEvent.id });
        } else {
            await addEvento(payload);
        }
        setIsEventModalOpen(false);
        resetForm();
    };

    const eventDetails = useMemo(() => {
        if (!selectedEvent) return null;
        
        const eventInscripciones = inscripciones.filter(i => i.eventoId === selectedEvent.id);
        
        const adolescentesInscritos = eventInscripciones.map(inscripcion => {
            const ado = adolescentes.find(a => a.id === inscripcion.adolescenteId);
            const pagosRealizados = pagos.filter(p => p.inscripcionId === inscripcion.id).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            const totalPagado = pagosRealizados.reduce((sum, p) => sum + p.monto, 0);
            return {
                adolescente: ado,
                inscripcion: inscripcion,
                totalPagado,
                pagos: pagosRealizados,
                debe: (selectedEvent.costoPersona || 0) - totalPagado,
            };
        })
        .filter(item => {
            const matchesSearch = item.adolescente && `${item.adolescente.nombre} ${item.adolescente.apellido}`.toLowerCase().includes(searchInscribedChico.toLowerCase());
            const matchesDeuda = !showOnlyDeudores || item.debe > 0;
            return matchesSearch && matchesDeuda;
        })
        .sort((a, b) => `${a.adolescente!.nombre} ${a.adolescente!.apellido}`.localeCompare(`${b.adolescente!.nombre} ${b.adolescente!.apellido}`));

        const inscritosServidores = inscripcionesServidores.filter(i => i.eventoId === selectedEvent.id).map(insc => {
            const s = servidores.find(ser => ser.id === insc.servidorId);
            const pagosS = pagosServidores.filter(p => p.inscripcionServidorId === insc.id).sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            const totalP = pagosS.reduce((acc, curr) => acc + curr.monto, 0);
            
            // Lógica de saldo basada en becas y Precio Especial Local
            let costoEsperado = selectedEvent.costoPersona || 0;
            if (insc.precioEspecialLocal) {
                costoEsperado = insc.montoAcordado || 0;
            } else if (insc.tipoBeca === 'Total') {
                costoEsperado = 0;
            } else if (insc.tipoBeca === 'Parcial') {
                costoEsperado = insc.montoAcordado || 0;
            }

            return {
                servidor: s,
                inscripcion: insc,
                totalPagado: totalP,
                pagos: pagosS,
                debe: costoEsperado - totalP,
                costoEsperado
            };
        })
        .filter(item => {
            const matchesSearch = item.servidor && `${item.servidor.nombre} ${item.servidor.apellido}`.toLowerCase().includes(searchInscribedServidor.toLowerCase());
            const matchesBeca = !showOnlyBecados || (item.inscripcion.tipoBeca !== 'Ninguna' || item.inscripcion.precioEspecialLocal);
            return matchesSearch && matchesBeca;
        })
        .sort((a, b) => `${a.servidor!.nombre} ${a.servidor!.apellido}`.localeCompare(`${b.servidor!.nombre} ${b.servidor!.apellido}`));

        const totalRecaudado = adolescentesInscritos.reduce((sum, i) => sum + i.totalPagado, 0) + inscritosServidores.reduce((sum, i) => sum + i.totalPagado, 0);
        
        const totalInscriptos = eventInscripciones.length + inscripcionesServidores.filter(i => i.eventoId === selectedEvent.id).length;
        const totalARecaudar = totalInscriptos * (selectedEvent.costoPersona || 0);

        // Cálculo de lo que la iglesia debe pagar (Total Becas)
        const totalBecas = inscripcionesServidores.filter(i => i.eventoId === selectedEvent.id).reduce((sum, i) => {
            const costo = selectedEvent.costoPersona || 0;
            if (i.tipoBeca === 'Total') return sum + costo;
            if (i.tipoBeca === 'Parcial' || i.precioEspecialLocal) return sum + (costo - (i.montoAcordado || 0));
            return sum;
        }, 0);

        return {
            inscritos: adolescentesInscritos,
            inscritosServidores,
            noInscritos: adolescentes.filter(a => a.estado === 'Activo' && !eventInscripciones.some(i => i.adolescenteId === a.id)).sort((a,b) => a.nombre.localeCompare(b.nombre)),
            noInscritosServidores: servidores.filter(s => !inscripcionesServidores.some(i => i.eventoId === selectedEvent.id && i.servidorId === s.id)).sort((a,b) => a.nombre.localeCompare(b.nombre)),
            summary: {
                totalRecaudado,
                totalARecaudar,
                totalInscriptos,
                totalBecas,
                costoPersona: selectedEvent.costoPersona || 0
            }
        };
    }, [selectedEvent, adolescentes, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores, searchInscribedChico, searchInscribedServidor, showOnlyBecados, showOnlyDeudores]);

    const handleAddPago = async (inscripcionId: number) => {
        const monto = parseFloat(newPayment[inscripcionId] || '0');
        const fecha = newPaymentDate[inscripcionId] || new Date().toISOString().split('T')[0];
        if (monto > 0) {
            await addPago(inscripcionId, monto, fecha);
            setNewPayment(prev => ({ ...prev, [inscripcionId]: '' }));
            setNewPaymentDate(prev => ({ ...prev, [inscripcionId]: '' }));
        }
    };

    const handleAddPagoServidor = async (inscId: number) => {
        const monto = parseFloat(newPaymentServidor[inscId] || '0');
        const fecha = newPaymentDateServidor[inscId] || new Date().toISOString().split('T')[0];
        if (monto > 0) {
            await addPagoServidor(inscId, monto, fecha);
            setNewPaymentServidor(prev => ({ ...prev, [inscId]: '' }));
            setNewPaymentDateServidor(prev => ({ ...prev, [inscId]: '' }));
        }
    };

    const handleAddInscripcionServidor = async () => {
        if (selectedEvent && servidorToInscribe) {
            const created = await addInscripcionServidor({
                eventoId: selectedEvent.id,
                servidorId: Number(servidorToInscribe),
                rol: rolServidorToInscribe,
                tipoBeca: becaServidorToInscribe,
                montoAcordado: Number(montoServidorToInscribe),
                iglesiaPagaSaldo: iglesiaPagaServidorToInscribe,
                precioEspecialLocal: precioEspecialLocalToInscribe
            });

            if (iglesiaPagaServidorToInscribe && created) {
                 await addPagoServidor(
                     created.id, 
                     selectedEvent.costoPersona || 0, 
                     new Date().toISOString().split('T')[0], 
                     'Beca total'
                 );
            }

            setServidorToInscribe('');
            setMontoServidorToInscribe('0');
            setBecaServidorToInscribe('Ninguna');
            setIglesiaPagaServidorToInscribe(false);
            setPrecioEspecialLocalToInscribe(false);
        }
    };

    const handleOpenEditInscripcion = (insc: InscripcionServidor) => {
        setEditingInscripcion({ ...insc });
        setIsEditInscripcionModalOpen(true);
    };

    const handleUpdateInscripcionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingInscripcion && selectedEvent) {
            const oldInsc = inscripcionesServidores.find(is => is.id === editingInscripcion.id);
            await updateInscripcionServidor(editingInscripcion);
            
            if (editingInscripcion.iglesiaPagaSaldo && (!oldInsc || !oldInsc.iglesiaPagaSaldo)) {
                 await addPagoServidor(
                     editingInscripcion.id, 
                     selectedEvent.costoPersona || 0, 
                     new Date().toISOString().split('T')[0], 
                     'Beca total'
                 );
            }

            setIsEditInscripcionModalOpen(false);
            setEditingInscripcion(null);
        }
    };

    const rolesServidor: RolServidor[] = ['Pastor', 'Padre', 'Madre', 'Lider de Color', 'Lider de Campamento', 'Cuidador', 'Apoyo', 'Cocina', 'Sonido', 'Alabanza', 'Otro'];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Eventos</h1>
                {hasPermission('eventos', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-bold shadow-md">
                        + Agregar Evento
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventos.map(evento => {
                    const eventAdoInscripciones = inscripciones.filter(i => i.eventoId === evento.id);
                    const eventServInscripciones = inscripcionesServidores.filter(i => i.eventoId === evento.id);
                    const countChicos = eventAdoInscripciones.length;
                    const countServidores = eventServInscripciones.length;
                    const totalInscriptos = countChicos + countServidores;

                    const proyectado = totalInscriptos * (evento.costoPersona || 0);
                    
                    const adoInscIds = eventAdoInscripciones.map(i => i.id);
                    const servInscIds = eventServInscripciones.map(i => i.id);
                    
                    const cobradoAdo = pagos.filter(p => adoInscIds.includes(p.inscripcionId)).reduce((sum, p) => sum + p.monto, 0);
                    const cobradoServ = pagosServidores.filter(p => servInscIds.includes(p.inscripcionServidorId)).reduce((sum, p) => sum + p.monto, 0);
                    const totalCobrado = cobradoAdo + cobradoServ;
                    const saldoPendiente = proyectado - totalCobrado;

                    const cargoIglesia = eventServInscripciones.reduce((sum, i) => {
                        const costo = evento.costoPersona || 0;
                        if (i.tipoBeca === 'Total') return sum + costo;
                        if (i.tipoBeca === 'Parcial' || i.precioEspecialLocal) return sum + (costo - (i.montoAcordado || 0));
                        return sum;
                    }, 0);

                    return (
                        <div key={evento.id} className="bg-surface p-5 rounded-lg shadow-lg flex flex-col justify-between cursor-pointer hover:ring-2 ring-primary transition-all relative group" onClick={() => { setSelectedEvent(evento); setActiveTabModal('chicos'); setSearchInscribedChico(''); setSearchInscribedServidor(''); setShowOnlyBecados(false); setShowOnlyDeudores(false); }}>
                            <div>
                                <div className="flex justify-between items-start">
                                    <h2 className="text-lg font-bold text-text-primary mb-1 pr-12">{evento.tema}</h2>
                                    <div className="absolute top-4 right-4 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => openModalForEdit(e, evento)} className="bg-gray-700 text-white p-1.5 rounded-md hover:bg-gray-600"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                                        <button onClick={(e) => handleDeleteClick(e, evento)} className="bg-red-600/80 text-white p-1.5 rounded-md hover:bg-red-600"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                    </div>
                                </div>
                                <p className="text-xs text-text-secondary uppercase font-bold tracking-widest">{evento.lugar}</p>
                                <p className="text-sm text-text-secondary mb-3">{formatDate(evento.fechaInicio)}</p>
                                <div className="flex gap-2 mb-4">
                                    <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">{countChicos} Chicos</span>
                                    <span className="text-[10px] bg-secondary/20 text-secondary px-2 py-0.5 rounded-full font-bold">{countServidores} Servidores</span>
                                </div>

                                {evento.tieneCosto && (
                                    <div className="bg-background/40 p-3 rounded-md border border-border/50 space-y-2">
                                        <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                                            <div className="flex flex-col">
                                                <span className="text-text-secondary uppercase font-bold">A Recaudar</span>
                                                <span className="text-primary font-black text-sm">{formatCurrency(proyectado)}</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-text-secondary uppercase font-bold">Cobrado</span>
                                                <span className="text-green-400 font-black text-sm">{formatCurrency(totalCobrado)}</span>
                                            </div>
                                            <div className="flex flex-col border-t border-border/30 pt-1">
                                                <span className="text-text-secondary uppercase font-bold">Costo p/p</span>
                                                <span className="text-text-primary font-bold">{formatCurrency(evento.costoPersona || 0)}</span>
                                            </div>
                                            <div className="flex flex-col text-right border-t border-border/30 pt-1">
                                                <span className="text-text-secondary uppercase font-bold">Saldo</span>
                                                <span className={`font-black text-sm ${saldoPendiente > 0 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(saldoPendiente)}</span>
                                            </div>
                                        </div>
                                        {cargoIglesia > 0 && (
                                            <div className="border-t border-indigo-500/30 pt-1 flex justify-between items-center text-[10px]">
                                                <span className="text-indigo-300 uppercase font-bold">Cargo Iglesia (Becas)</span>
                                                <span className="text-indigo-400 font-black">{formatCurrency(cargoIglesia)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                                <span className={`font-bold text-xs uppercase ${evento.tieneCosto ? 'text-secondary' : 'text-green-400'}`}>
                                    {evento.tieneCosto ? 'Evento con Costo' : 'Evento Gratuito'}
                                </span>
                                <span className="text-[10px] text-text-secondary uppercase">Click para gestionar</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedEvent && eventDetails && (
                <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={`Gestionar: ${selectedEvent.tema}`} size="3xl">
                    <div className="space-y-6">
                        {selectedEvent.tieneCosto && (
                            <div className="bg-background/40 p-4 rounded-lg border border-border grid grid-cols-1 sm:grid-cols-4 gap-4 items-center shadow-inner">
                                <div>
                                    <p className="text-[10px] text-text-secondary uppercase font-bold">Total Cobrado</p>
                                    <p className="text-xl font-black text-green-400">{formatCurrency(eventDetails.summary.totalRecaudado)}</p>
                                    <p className="text-[10px] text-text-secondary italic">Abonos registrados</p>
                                </div>
                                <div className="sm:text-center sm:border-l border-border/50 px-2">
                                    <p className="text-[10px] text-text-secondary uppercase font-bold">Total a Recaudar</p>
                                    <p className="text-xl font-black text-primary">{formatCurrency(eventDetails.summary.totalARecaudar)}</p>
                                    <p className="text-[10px] text-text-secondary italic">({eventDetails.summary.totalInscriptos} inscriptos)</p>
                                </div>
                                <div className="sm:text-center sm:border-l border-border/50 px-2">
                                    <p className="text-[10px] text-indigo-300 uppercase font-bold">Total Becas</p>
                                    <p className="text-xl font-black text-indigo-400">{formatCurrency(eventDetails.summary.totalBecas)}</p>
                                    <p className="text-[10px] text-text-secondary italic">Cargo Iglesia</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-text-secondary uppercase font-bold">Costo Individual</p>
                                    <p className="text-lg font-bold text-text-primary">{formatCurrency(eventDetails.summary.costoPersona)}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex border-b border-border">
                            <button onClick={() => setActiveTabModal('chicos')} className={`px-4 py-2 font-bold transition ${activeTabModal === 'chicos' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Chicos ({eventDetails.inscritos.length})</button>
                            <button onClick={() => setActiveTabModal('servidores')} className={`px-4 py-2 font-bold transition ${activeTabModal === 'servidores' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Servidores Apoyo ({eventDetails.inscritosServidores.length})</button>
                        </div>

                        {activeTabModal === 'chicos' && (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-2 p-3 bg-background/30 rounded-lg">
                                    <select value={adolescenteToInscribe} onChange={e => setAdolescenteToInscribe(e.target.value)} className="flex-1 bg-surface border border-border rounded-md p-2 text-sm">
                                        <option value="">-- Inscribir Nuevo Adolescente --</option>
                                        {eventDetails.noInscritos.map(ado => <option key={ado.id} value={ado.id}>{ado.nombre} {ado.apellido}</option>)}
                                    </select>
                                    <button onClick={() => { if (selectedEvent && adolescenteToInscribe) addInscripcion(selectedEvent.id, Number(adolescenteToInscribe)); setAdolescenteToInscribe(''); }} disabled={!adolescenteToInscribe} className="bg-primary text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap">Inscribir</button>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="relative flex-1 w-full">
                                        <input 
                                            type="text" 
                                            placeholder="🔍 Buscar chico inscripto para cargar pago..." 
                                            value={searchInscribedChico}
                                            onChange={(e) => setSearchInscribedChico(e.target.value)}
                                            className="w-full bg-background border border-border p-2 pl-10 rounded-md text-sm outline-none focus:ring-1 ring-primary"
                                        />
                                        <UsersIcon className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                                    </div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60 transition whitespace-nowrap select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={showOnlyDeudores} 
                                            onChange={(e) => setShowOnlyDeudores(e.target.checked)}
                                            className="h-4 w-4 text-primary rounded border-border focus:ring-primary bg-background"
                                        />
                                        <span>Solo con saldo pendiente</span>
                                    </label>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                    {eventDetails.inscritos.map(item => (
                                        <div key={item.inscripcion.id} className="bg-background/20 p-4 rounded-lg border border-border space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-bold text-lg">{item.adolescente!.nombre} {item.adolescente!.apellido}</p>
                                                    <div className="flex gap-3 items-center mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${item.debe <= 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                            Pagado: {formatCurrency(item.totalPagado)}
                                                        </span>
                                                        {item.debe > 0 && <span className="text-xs text-red-400 font-bold">Deuda: {formatCurrency(item.debe)}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => toggleHistory('ado', item.inscripcion.id)} className="text-[10px] text-primary uppercase font-bold hover:underline flex items-center gap-1">
                                                        Historial <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedHistory[`ado-${item.inscripcion.id}`] ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <button onClick={() => deleteInscripcion(item.inscripcion.id)} className="text-red-500 text-[10px] uppercase font-bold hover:underline">Eliminar</button>
                                                </div>
                                            </div>

                                            {selectedEvent.tieneCosto && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-background/40 p-2 rounded-md border border-border/50">
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Fecha Pago</label>
                                                        <input type="date" value={newPaymentDate[item.inscripcion.id] || new Date().toISOString().split('T')[0]} onChange={e => setNewPaymentDate({...newPaymentDate, [item.inscripcion.id]: e.target.value})} className="w-full bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Monto a Cuenta</label>
                                                        <input type="number" placeholder="Ej: 50000" value={newPayment[item.inscripcion.id] || ''} onChange={e => setNewPayment({...newPayment, [item.inscripcion.id]: e.target.value})} className="w-full bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <button onClick={() => handleAddPago(item.inscripcion.id)} className="w-full bg-secondary text-white py-1.5 rounded text-sm font-bold shadow-md hover:bg-emerald-600 transition">Abonar Pago</button>
                                                    </div>
                                                </div>
                                            )}

                                            {expandedHistory[`ado-${item.inscripcion.id}`] && (
                                                <div className="bg-background/60 p-3 rounded-md border border-border border-dashed animate-fade-in">
                                                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-2">Desglose de Abonos:</p>
                                                    {item.pagos.length === 0 ? (
                                                        <p className="text-xs text-text-secondary italic">No se han registrado pagos aún.</p>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {item.pagos.map(p => (
                                                                <div key={p.id} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                                                                    <div className="flex gap-4">
                                                                        <span className="font-mono text-text-secondary">{formatDate(p.fecha)}</span>
                                                                        <span className="font-bold text-green-400">{formatCurrency(p.monto)}</span>
                                                                    </div>
                                                                    <button onClick={() => deletePago(p.id)} className="text-red-500 hover:text-red-400 p-1" title="Eliminar abono">
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {eventDetails.inscritos.length === 0 && <p className="text-center text-text-secondary text-sm py-4">No se encontraron inscritos con los filtros aplicados.</p>}
                                </div>
                            </div>
                        )}

                        {activeTabModal === 'servidores' && (
                            <div className="space-y-4">
                                <div className="bg-background/30 p-4 rounded-lg border border-border space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <select value={servidorToInscribe} onChange={e => setServidorToInscribe(e.target.value)} className="bg-surface border border-border rounded-md p-2 text-sm">
                                            <option value="">-- Seleccionar Servidor --</option>
                                            {eventDetails.noInscritosServidores.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
                                        </select>
                                        <select value={rolServidorToInscribe} onChange={e => setRolServidorToInscribe(e.target.value as RolServidor)} className="bg-surface border border-border rounded-md p-2 text-sm">
                                            {rolesServidor.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                                        <div>
                                            <label className="text-[10px] text-text-secondary uppercase font-bold">¿Cuenta con Beca?</label>
                                            <select value={becaServidorToInscribe} onChange={e => setBecaServidorToInscribe(e.target.value as TipoBeca)} className="w-full bg-surface border border-border rounded-md p-2 text-sm">
                                                <option value="Ninguna">Ninguna</option>
                                                <option value="Parcial">Beca Parcial</option>
                                                <option value="Total">Beca Total (100%)</option>
                                            </select>
                                        </div>
                                        
                                        {(becaServidorToInscribe === 'Parcial' || precioEspecialLocalToInscribe) && (
                                            <div>
                                                <label className="text-[10px] text-text-secondary uppercase font-bold">Monto que puede pagar</label>
                                                <input type="number" value={montoServidorToInscribe} onChange={e => setMontoServidorToInscribe(e.target.value)} className="w-full bg-surface border border-border rounded-md p-2 text-sm" placeholder="Monto acordado" />
                                            </div>
                                        )}
                                        
                                        <div className="flex flex-col gap-2 pb-2">
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" checked={precioEspecialLocalToInscribe} onChange={e => setPrecioEspecialLocalToInscribe(e.target.checked)} className="h-4 w-4 text-primary rounded" />
                                                <label className="text-xs font-medium text-text-secondary">Precio Especial Local</label>
                                            </div>
                                            {(becaServidorToInscribe === 'Parcial' || becaServidorToInscribe === 'Total') && (
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={iglesiaPagaServidorToInscribe} onChange={e => setIglesiaPagaServidorToInscribe(e.target.checked)} className="h-4 w-4 text-primary rounded" />
                                                    <label className="text-xs font-medium text-text-secondary">Iglesia paga saldo</label>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <button onClick={handleAddInscripcionServidor} disabled={!servidorToInscribe} className={`bg-primary text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap ${(becaServidorToInscribe === 'Ninguna' && !precioEspecialLocalToInscribe) ? 'sm:col-span-2' : ''}`}>Inscribir Apoyo</button>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="relative flex-1 w-full">
                                        <input 
                                            type="text" 
                                            placeholder="🔍 Buscar servidor inscripto para cargar pago..." 
                                            value={searchInscribedServidor}
                                            onChange={(e) => setSearchInscribedServidor(e.target.value)}
                                            className="w-full bg-background border border-border p-2 pl-10 rounded-md text-sm outline-none focus:ring-1 ring-primary"
                                        />
                                        <UsersIcon className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                                    </div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60 transition whitespace-nowrap select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={showOnlyBecados} 
                                            onChange={(e) => setShowOnlyBecados(e.target.checked)}
                                            className="h-4 w-4 text-primary rounded border-border focus:ring-primary bg-background"
                                        />
                                        <span>Ver solo becados</span>
                                    </label>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                    {eventDetails.inscritosServidores.map(item => (
                                        <div key={item.inscripcion.id} className="bg-background/20 p-4 rounded-lg border border-border space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-lg">{item.servidor!.nombre} {item.servidor!.apellido}</p>
                                                        <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded uppercase font-bold">{item.inscripcion.rol}</span>
                                                        {item.inscripcion.precioEspecialLocal && (
                                                            <span className="text-[10px] bg-orange-500/30 text-orange-300 px-2 py-0.5 rounded uppercase font-bold">Precio Especial</span>
                                                        )}
                                                        {item.inscripcion.tipoBeca !== 'Ninguna' && (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${item.inscripcion.tipoBeca === 'Total' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                                Beca {item.inscripcion.tipoBeca}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 items-center mt-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${item.debe <= 0 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                            Pagado: {formatCurrency(item.totalPagado)} / {formatCurrency(item.costoEsperado)}
                                                        </span>
                                                        {item.debe > 0 && <span className="text-xs text-red-400 font-bold">Deuda: {formatCurrency(item.debe)}</span>}
                                                        {item.inscripcion.iglesiaPagaSaldo && (
                                                            <span className="text-[10px] text-text-secondary italic">Iglesia cubre saldo</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleOpenEditInscripcion(item.inscripcion)} className="text-[10px] text-indigo-400 uppercase font-bold hover:underline flex items-center gap-1">
                                                        <PencilIcon className="w-3.5 h-3.5" /> Editar Beca
                                                    </button>
                                                    <button onClick={() => toggleHistory('ser', item.inscripcion.id)} className="text-[10px] text-primary uppercase font-bold hover:underline flex items-center gap-1">
                                                        Historial <ChevronDownIcon className={`w-3 h-3 transition-transform ${expandedHistory[`ser-${item.inscripcion.id}`] ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <button onClick={() => deleteInscripcionServidor(item.inscripcion.id)} className="text-red-500 text-[10px] uppercase font-bold hover:underline">Eliminar</button>
                                                </div>
                                            </div>

                                            {selectedEvent.tieneCosto && item.inscripcion.tipoBeca !== 'Total' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-background/40 p-2 rounded-md border border-border/50">
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Fecha Pago</label>
                                                        <input type="date" value={newPaymentDateServidor[item.inscripcion.id] || new Date().toISOString().split('T')[0]} onChange={e => setNewPaymentDateServidor({...newPaymentDateServidor, [item.inscripcion.id]: e.target.value})} className="w-full bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                                    </div>
                                                    <div className="col-span-1">
                                                        <label className="text-[10px] text-text-secondary uppercase font-bold ml-1">Monto a Cuenta</label>
                                                        <input type="number" placeholder="Ej: 100000" value={newPaymentServidor[item.inscripcion.id] || ''} onChange={e => setNewPaymentServidor({...newPaymentServidor, [item.inscripcion.id]: e.target.value})} className="w-full bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary" />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <button onClick={() => handleAddPagoServidor(item.inscripcion.id)} className="w-full bg-secondary text-white py-1.5 rounded text-sm font-bold shadow-md hover:bg-emerald-600 transition">Abonar Pago</button>
                                                    </div>
                                                </div>
                                            )}

                                            {expandedHistory[`ser-${item.inscripcion.id}`] && (
                                                <div className="bg-background/60 p-3 rounded-md border border-border border-dashed animate-fade-in">
                                                    <p className="text-[10px] text-text-secondary uppercase font-bold mb-2">Desglose de Abonos:</p>
                                                    {item.pagos.length === 0 ? (
                                                        <p className="text-xs text-text-secondary italic">No se han registrado pagos aún.</p>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {item.pagos.map(p => (
                                                                <div key={p.id} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                                                                    <div className="flex gap-4">
                                                                        <span className="font-mono text-text-secondary">{formatDate(p.fecha)}</span>
                                                                        <span className="font-bold text-green-400">{formatCurrency(p.monto)}</span>
                                                                    </div>
                                                                    <button onClick={() => deletePagoServidor(p.id)} className="text-red-500 hover:text-red-400 p-1" title="Eliminar abono">
                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {eventDetails.inscritosServidores.length === 0 && <p className="text-center text-text-secondary text-sm py-4">No se encontraron servidores con los filtros aplicados.</p>}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end pt-4 border-t border-border">
                            <button onClick={() => setSelectedEvent(null)} className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-bold">Cerrar Gestión</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL PARA EDITAR CONDICIONES DE INSCRIPCIÓN DE SERVIDOR */}
            <Modal isOpen={isEditInscripcionModalOpen} onClose={() => setIsEditInscripcionModalOpen(false)} title="Editar Condiciones del Servidor">
                {editingInscripcion && (
                    <form onSubmit={handleUpdateInscripcionSubmit} className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg mb-4">
                            <p className="text-sm font-bold text-primary uppercase">Servidor:</p>
                            <p className="text-xl font-bold">
                                {servidores.find(s => s.id === editingInscripcion.servidorId)?.nombre} {servidores.find(s => s.id === editingInscripcion.servidorId)?.apellido}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">Función / Rol</label>
                                <select 
                                    value={editingInscripcion.rol} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, rol: e.target.value as RolServidor})}
                                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary"
                                >
                                    {rolesServidor.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary">Tipo de Beca</label>
                                <select 
                                    value={editingInscripcion.tipoBeca} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, tipoBeca: e.target.value as TipoBeca})}
                                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary"
                                >
                                    <option value="Ninguna">Ninguna</option>
                                    <option value="Parcial">Beca Parcial</option>
                                    <option value="Total">Beca Total (100%)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2">
                             <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    checked={editingInscripcion.precioEspecialLocal} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, precioEspecialLocal: e.target.checked})}
                                    className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background"
                                />
                                <label className="text-sm font-bold text-text-secondary">Precio Especial Local</label>
                            </div>
                        </div>

                        {(editingInscripcion.tipoBeca === 'Parcial' || editingInscripcion.precioEspecialLocal) && (
                            <InputField 
                                label="Monto Acordado (Monto final a pagar)" 
                                type="number" 
                                value={editingInscripcion.montoAcordado || 0} 
                                onChange={e => setEditingInscripcion({...editingInscripcion, montoAcordado: Number(e.target.value)})}
                            />
                        )}

                        {(editingInscripcion.tipoBeca === 'Parcial' || editingInscripcion.tipoBeca === 'Total') && (
                            <div className="flex items-center gap-2 bg-background/30 p-3 rounded-md">
                                <input 
                                    type="checkbox" 
                                    checked={editingInscripcion.iglesiaPagaSaldo} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, iglesiaPagaSaldo: e.target.checked})}
                                    className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background"
                                />
                                <label className="text-sm font-medium text-text-secondary italic">La iglesia cubre el saldo restante del costo</label>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                            <button type="button" onClick={() => setIsEditInscripcionModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                            <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg">Actualizar Condiciones</button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={editingEvent ? "Editar Evento" : "Crear Nuevo Evento"}>
                <form onSubmit={handleEventSubmit} className="space-y-4">
                    <InputField label="Tema / Nombre del Evento" name="tema" value={values.tema} onChange={handleInputChange} required />
                    <InputField label="Lugar" name="lugar" value={values.lugar} onChange={handleInputChange} required />
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Fecha Inicio" name="fechaInicio" type="date" value={values.fechaInicio} onChange={handleInputChange} required />
                        <InputField label="Hora Inicio" name="horaInicio" type="time" value={values.horaInicio} onChange={handleInputChange} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <InputField label="Fecha Fin" name="fechaFin" type="date" value={values.fechaFin} onChange={handleInputChange} required />
                        <InputField label="Hora Fin" name="horaFin" type="time" value={values.horaFin} onChange={handleInputChange} required />
                    </div>
                    <CheckboxField label="¿Tiene Costo?" name="tieneCosto" checked={values.tieneCosto} onChange={handleInputChange} />
                    {values.tieneCosto && (
                        <div className="grid grid-cols-2 gap-4 bg-background/50 p-3 rounded-md border border-border">
                            <InputField label="Costo por Persona" name="costoPersona" type="number" value={values.costoPersona || 0} onChange={handleInputChange} />
                            <InputField label="Costo Total (Opcional)" name="costoTotal" type="number" value={values.costoTotal || 0} onChange={handleInputChange} />
                        </div>
                    )}
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => setIsEventModalOpen(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg">Guardar Evento</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Evento"
                message={<>¿Estás seguro de eliminar <strong>{eventToDelete?.tema}</strong>? Se borrarán todas las inscripciones y pagos de chicos y servidores.</>}
            />
        </div>
    );
};

export default Eventos;
