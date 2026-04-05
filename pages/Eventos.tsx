
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Evento, Adolescente, InscripcionEvento, PagoEvento, Servidor, InscripcionServidor, RolServidor, PagoServidor, TipoBeca } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { ChevronDownIcon, TrashIcon, UsersIcon, PencilIcon, RefreshIcon, CheckCircleIcon, ClipboardListIcon, ShieldIcon, HeartHandshakeIcon, CalculatorIcon } from '../components/ui/Icons';

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input {...props} id={props.name} className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary disabled:opacity-50 transition-all sm:text-sm" />
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
        eventos, adolescentes, tutores, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores,
        addEvento, updateEvento, deleteEvento,
        addInscripcion, updateInscripcion, deleteInscripcion, addPago, deletePago,
        addInscripcionServidor, updateInscripcionServidor, deleteInscripcionServidor, addPagoServidor, deletePagoServidor
    } = useData();
    const { hasPermission } = useAuth();
    
    const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
    const [activeTabModal, setActiveTabModal] = useState<'chicos' | 'servidores'>('chicos');
    
    // States for Loading / Actions
    const [isSavingPayment, setIsSavingPayment] = useState<{ [key: number]: boolean }>({});

    // Server Enrollment State
    const [servidorToInscribe, setServidorToInscribe] = useState<string>('');
    const [rolServidorToInscribe, setRolServidorToInscribe] = useState<RolServidor>('Apoyo');
    const [becaServidorToInscribe, setBecaServidorToInscribe] = useState<TipoBeca>('Ninguna');
    const [montoServidorToInscribe, setMontoServidorToInscribe] = useState<string>('0');
    const [precioEspecialToInscribe, setPrecioEspecialToInscribe] = useState<boolean>(false);
    const [iglesiaPagaSaldoToInscribe, setIglesiaPagaSaldoToInscribe] = useState<boolean>(false);
    const [isAddConditionsModalOpen, setIsAddConditionsModalOpen] = useState(false);
    
    // Edit Enrollment State
    const [editingInscripcion, setEditingInscripcion] = useState<InscripcionServidor | null>(null);
    const [isEditInscripcionModalOpen, setIsEditInscripcionModalOpen] = useState(false);
    
    const [adolescenteToInscribe, setAdolescenteToInscribe] = useState<string>('');
    
    // Filtros de la lista interna (Modal Gestionar)
    const [searchInscribedChico, setSearchInscribedChico] = useState('');
    const [showOnlyDeudores, setShowOnlyDeudores] = useState(false);
    const [showOnlyPagadosFull, setShowOnlyPagadosFull] = useState(false);

    const [searchInscribedServidor, setSearchInscribedServidor] = useState('');
    const [showOnlyBecados, setShowOnlyBecados] = useState(false);
    const [showOnlyPrecioLocal, setShowOnlyPrecioLocal] = useState(false);

    const [newPayment, setNewPayment] = useState<{ [key: number]: string }>({});
    const [newPaymentDate, setNewPaymentDate] = useState<{ [key: number]: string }>({});
    const [newPaymentNote, setNewPaymentNote] = useState<{ [key: number]: string }>({});
    
    const [newPaymentServidor, setNewPaymentServidor] = useState<{ [key: number]: string }>({});
    const [newPaymentDateServidor, setNewPaymentDateServidor] = useState<{ [key: number]: string }>({});
    const [newPaymentNoteServidor, setNewPaymentNoteServidor] = useState<{ [key: number]: string }>({});

    const [expandedHistory, setExpandedHistory] = useState<{ [key: string]: boolean }>({});
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Evento | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<Evento | null>(null);

    // Nuevos estados para eliminar inscripciones
    const [inscripcionToDelete, setInscripcionToDelete] = useState<InscripcionEvento | null>(null);
    const [isDeleteInscripcionConfirmOpen, setIsDeleteInscripcionConfirmOpen] = useState(false);
    const [inscripcionServidorToDelete, setInscripcionServidorToDelete] = useState<InscripcionServidor | null>(null);
    const [isDeleteInscripcionServidorConfirmOpen, setIsDeleteInscripcionServidorConfirmOpen] = useState(false);

    const initialEventFormState: Omit<Evento, 'id'> = {
        tema: '', lugar: '', fechaInicio: '', horaInicio: '', fechaFin: '', horaFin: '',
        tieneCosto: false, costoTotal: 0, costoPersona: 0, esParaPadres: false
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
        setValues({
            tema: event.tema,
            lugar: event.lugar,
            fechaInicio: event.fechaInicio,
            horaInicio: event.horaInicio || '',
            fechaFin: event.fechaFin || '',
            horaFin: event.horaFin || '',
            tieneCosto: event.tieneCosto,
            costoTotal: event.costoTotal || 0,
            costoPersona: event.costoPersona || 0,
            esParaPadres: event.esParaPadres || false
        });
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
            const persona = selectedEvent.esParaPadres 
                ? tutores.find(t => t.id === inscripcion.tutorId)
                : adolescentes.find(a => a.id === inscripcion.adolescenteId);
                
            const pagosRealizados = pagos.filter(p => Number(p.inscripcionId) === Number(inscripcion.id)).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            const totalPagado = pagosRealizados.reduce((sum, p) => sum + p.monto, 0);
            return {
                persona: persona,
                inscripcion: inscripcion,
                totalPagado,
                pagos: pagosRealizados,
                debe: (selectedEvent.costoPersona || 0) - totalPagado,
            };
        })
        .filter(item => {
            const matchesSearch = item.persona && `${item.persona.nombre} ${item.persona.apellido}`.toLowerCase().includes(searchInscribedChico.toLowerCase());
            const matchesDeuda = !showOnlyDeudores || item.debe > 0;
            const matchesPagado = !showOnlyPagadosFull || item.debe <= 0;
            return matchesSearch && matchesDeuda && matchesPagado;
        })
        .sort((a, b) => {
            if (!a.persona || !b.persona) return 0;
            return `${a.persona.nombre} ${a.persona.apellido}`.localeCompare(`${b.persona.nombre} ${b.persona.apellido}`);
        });

        const inscritosServidores = inscripcionesServidores.filter(i => i.eventoId === selectedEvent.id).map(insc => {
            const s = servidores.find(ser => ser.id === insc.servidorId);
            const pagosS = pagosServidores.filter(p => Number(p.inscripcionServidorId) === Number(insc.id)).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
            const totalP = pagosS.reduce((acc, curr) => acc + curr.monto, 0);
            
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
            const matchesBeca = !showOnlyBecados || (item.inscripcion.tipoBeca !== 'Ninguna');
            const matchesPrecioLocal = !showOnlyPrecioLocal || item.inscripcion.precioEspecialLocal;
            return matchesSearch && matchesBeca && matchesPrecioLocal;
        })
        .sort((a, b) => `${a.servidor!.nombre} ${a.servidor!.apellido}`.localeCompare(`${b.servidor!.nombre} ${b.servidor!.apellido}`));

        return {
            inscritos: adolescentesInscritos,
            inscritosServidores,
            noInscritos: selectedEvent.esParaPadres 
                ? tutores.filter(t => !eventInscripciones.some(i => i.tutorId === t.id)).sort((a,b) => a.nombre.localeCompare(b.nombre))
                : adolescentes.filter(a => a.estado === 'Activo' && !eventInscripciones.some(i => i.adolescenteId === a.id)).sort((a,b) => a.nombre.localeCompare(b.nombre)),
            noInscritosServidores: servidores.filter(s => !inscripcionesServidores.some(i => i.eventoId === selectedEvent.id && i.servidorId === s.id)).sort((a,b) => a.nombre.localeCompare(b.nombre)),
        };
    }, [selectedEvent, adolescentes, tutores, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores, searchInscribedChico, showOnlyDeudores, showOnlyPagadosFull, searchInscribedServidor, showOnlyBecados, showOnlyPrecioLocal]);

    const handleAddPago = async (inscripcionId: number) => {
        // Limpiamos el valor de posibles puntos de miles que el usuario pueda escribir (Gs. 270.000 -> 270000)
        const rawMonto = String(newPayment[inscripcionId] || '0').replace(/\./g, '');
        const monto = parseFloat(rawMonto);
        const fecha = newPaymentDate[inscripcionId] || new Date().toISOString().split('T')[0];
        const notas = newPaymentNote[inscripcionId] || '';
        
        if (monto <= 0) {
            alert("Por favor, ingrese un monto válido mayor a cero.");
            return;
        }

        setIsSavingPayment(prev => ({ ...prev, [inscripcionId]: true }));
        try {
            await addPago(inscripcionId, monto, fecha, notas);
            setNewPayment(prev => ({ ...prev, [inscripcionId]: '' }));
            setNewPaymentDate(prev => ({ ...prev, [inscripcionId]: '' }));
            setNewPaymentNote(prev => ({ ...prev, [inscripcionId]: '' }));
        } catch (error: any) {
            console.error("Error al registrar pago:", error);
            alert("Hubo un error al grabar el pago: " + (error.message || "Error desconocido."));
        } finally {
            setIsSavingPayment(prev => ({ ...prev, [inscripcionId]: false }));
        }
    };

    const handleAddPagoServidor = async (inscId: number) => {
        const rawMonto = String(newPaymentServidor[inscId] || '0').replace(/\./g, '');
        const monto = parseFloat(rawMonto);
        const fecha = newPaymentDateServidor[inscId] || new Date().toISOString().split('T')[0];
        const notas = newPaymentNoteServidor[inscId] || '';
        
        if (monto <= 0) {
            alert("Por favor, ingrese un monto válido mayor a cero.");
            return;
        }

        setIsSavingPayment(prev => ({ ...prev, [inscId]: true }));
        try {
            await addPagoServidor(inscId, monto, fecha, notas);
            setNewPaymentServidor(prev => ({ ...prev, [inscId]: '' }));
            setNewPaymentDateServidor(prev => ({ ...prev, [inscId]: '' }));
            setNewPaymentNoteServidor(prev => ({ ...prev, [inscId]: '' }));
        } catch (error: any) {
            console.error("Error al registrar pago servidor:", error);
            alert("Hubo un error al grabar el pago: " + (error.message || "Error desconocido."));
        } finally {
            setIsSavingPayment(prev => ({ ...prev, [inscId]: false }));
        }
    };

    const handleTriggerInscripcionServidor = () => {
        if (servidorToInscribe) {
            setRolServidorToInscribe('Apoyo');
            setBecaServidorToInscribe('Ninguna');
            setMontoServidorToInscribe('0');
            setPrecioEspecialToInscribe(false);
            setIglesiaPagaSaldoToInscribe(false);
            setIsAddConditionsModalOpen(true);
        }
    };

    const handleAddInscripcionServidorConfirm = async () => {
        if (selectedEvent && servidorToInscribe) {
            await addInscripcionServidor({
                eventoId: selectedEvent.id,
                servidorId: Number(servidorToInscribe),
                rol: rolServidorToInscribe,
                tipoBeca: becaServidorToInscribe,
                montoAcordado: Number(montoServidorToInscribe),
                iglesiaPagaSaldo: iglesiaPagaSaldoToInscribe,
                precioEspecialLocal: precioEspecialToInscribe
            });
            setIsAddConditionsModalOpen(false);
            setServidorToInscribe('');
        }
    };

    const handleOpenEditInscripcion = (insc: InscripcionServidor) => {
        setEditingInscripcion({ ...insc });
        setIsEditInscripcionModalOpen(true);
    };

    const handleUpdateInscripcionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingInscripcion && selectedEvent) {
            await updateInscripcionServidor(editingInscripcion);
            setIsEditInscripcionModalOpen(false);
            setEditingInscripcion(null);
        }
    };

    // Handlers para eliminación de inscripciones
    const handleConfirmDeleteInscripcion = async () => {
        if (inscripcionToDelete) {
            await deleteInscripcion(inscripcionToDelete.id);
            setInscripcionToDelete(null);
            setIsDeleteInscripcionConfirmOpen(false);
        }
    };

    const handleConfirmDeleteInscripcionServidor = async () => {
        if (inscripcionServidorToDelete) {
            await deleteInscripcionServidor(inscripcionServidorToDelete.id);
            setInscripcionServidorToDelete(null);
            setIsDeleteInscripcionServidorConfirmOpen(false);
        }
    };

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
                    const eventAdoInsc = inscripciones.filter(i => i.eventoId === evento.id);
                    const eventSerInsc = inscripcionesServidores.filter(i => i.eventoId === evento.id);
                    const costoBase = evento.costoPersona || 0;

                    let totalCobrado = 0;
                    let totalEsperadoReal = 0;
                    let becasMonto = 0;
                    let acuerdosMonto = 0;
                    let cantPagados = 0;
                    let cantConSaldo = 0;
                    let cantBecados = 0;
                    let cantAcuerdos = 0;

                    // Procesar Chicos
                    eventAdoInsc.forEach(i => {
                        const personaPagos = pagos.filter(p => Number(p.inscripcionId) === Number(i.id)).reduce((sum, p) => sum + p.monto, 0);
                        totalCobrado += personaPagos;
                        totalEsperadoReal += costoBase;
                        if (costoBase - personaPagos <= 0) cantPagados++;
                        else cantConSaldo++;
                    });

                    // Procesar Servidores
                    eventSerInsc.forEach(i => {
                        const personaPagos = pagosServidores.filter(p => Number(p.inscripcionServidorId) === Number(i.id)).reduce((sum, p) => sum + p.monto, 0);
                        totalCobrado += personaPagos;
                        
                        let miEsperado = costoBase;
                        if (i.precioEspecialLocal) {
                            miEsperado = i.montoAcordado || 0;
                            acuerdosMonto += miEsperado;
                            cantAcuerdos++;
                        } else if (i.tipoBeca === 'Total') {
                            miEsperado = 0;
                            becasMonto += costoBase;
                            cantBecados++;
                        } else if (i.tipoBeca === 'Parcial') {
                            miEsperado = i.montoAcordado || 0;
                            becasMonto += (costoBase - miEsperado);
                            cantBecados++;
                        }

                        totalEsperadoReal += miEsperado;
                        if (miEsperado - personaPagos <= 0) cantPagados++;
                        else cantConSaldo++;
                    });

                    const saldoPendiente = totalEsperadoReal - totalCobrado;
                    const cantTotal = eventAdoInsc.length + eventSerInsc.length;
                    const cantAsistentes = eventAdoInsc.filter(i => i.asistio).length;

                    return (
                        <div key={evento.id} className={`bg-surface p-5 rounded-lg shadow-lg flex flex-col justify-between cursor-pointer hover:ring-2 ring-primary transition-all relative group ${evento.finalizado ? 'opacity-80' : ''}`} onClick={() => setSelectedEvent(evento)}>
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex flex-col">
                                        <h2 className="text-xl font-bold text-text-primary pr-12 line-clamp-1">{evento.tema}</h2>
                                        {evento.finalizado && (
                                            <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest w-max mt-1 border border-red-500/50">Finalizado</span>
                                        )}
                                    </div>
                                    <div className="absolute top-4 right-4 flex space-x-1">
                                        {hasPermission('eventos', 'update') && <button onClick={(e) => openModalForEdit(e, evento)} className="bg-gray-700 text-white p-2 rounded-md hover:bg-gray-600 transition shadow" title="Editar Evento"><PencilIcon className="w-4 h-4" /></button>}
                                        {hasPermission('eventos', 'delete') && <button onClick={(e) => handleDeleteClick(e, evento)} className="bg-red-600/80 text-white p-2 rounded-md hover:bg-red-600 transition shadow" title="Borrar Evento"><TrashIcon className="w-4 h-4" /></button>}
                                    </div>
                                </div>
                                <div className="space-y-1 mb-4">
                                    <p className="text-xs text-text-secondary uppercase font-bold tracking-widest">{evento.lugar}</p>
                                    <p className="text-sm text-text-secondary">{formatDate(evento.fechaInicio)} {evento.horaInicio ? ` - ${evento.horaInicio}` : ''}</p>
                                </div>
                                
                                {evento.tieneCosto ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3 bg-background/40 p-3 rounded-lg border border-border/50">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] text-text-secondary uppercase font-black">Cobrado en Caja</span>
                                                <span className="text-sm font-black text-green-400">{formatCurrency(totalCobrado)}</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[9px] text-text-secondary uppercase font-black">Saldo Pendiente</span>
                                                <span className={`text-sm font-black ${saldoPendiente > 0 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(saldoPendiente)}</span>
                                            </div>
                                            <div className="flex flex-col border-t border-border/20 pt-1">
                                                <span className="text-[9px] text-indigo-300 uppercase font-black">Becas (Iglesia)</span>
                                                <span className="text-xs font-bold text-indigo-400">{formatCurrency(becasMonto)}</span>
                                            </div>
                                            <div className="flex flex-col text-right border-t border-border/20 pt-1">
                                                <span className="text-[9px] text-orange-300 uppercase font-black">Acuerdos Locales</span>
                                                <span className="text-xs font-bold text-orange-400">{formatCurrency(acuerdosMonto)}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-text-secondary font-bold">Inscriptos</p>
                                                <p className="text-sm font-black">{cantTotal}</p>
                                            </div>
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-green-400/70 font-bold">Asistentes</p>
                                                <p className="text-sm font-black text-green-400">{cantAsistentes}</p>
                                            </div>
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-green-400/70 font-bold">Pagados</p>
                                                <p className="text-sm font-black text-green-400">{cantPagados}</p>
                                            </div>
                                            <div className="bg-background/20 rounded p-2 text-center border border-border/30">
                                                <p className="text-[8px] uppercase text-red-400/70 font-bold">Con Saldo</p>
                                                <p className="text-sm font-black text-red-400">{cantConSaldo}</p>
                                            </div>
                                            <div className="bg-indigo-500/5 rounded p-2 text-center border border-indigo-500/20 col-span-2">
                                                <p className="text-[8px] uppercase text-indigo-300 font-bold">Becados</p>
                                                <p className="text-xs font-black text-indigo-400">{cantBecados}</p>
                                            </div>
                                            <div className="bg-orange-500/5 rounded p-2 text-center border border-orange-500/20 col-span-2">
                                                <p className="text-[8px] uppercase text-orange-300 font-bold">Acuerdos Locales</p>
                                                <p className="text-xs font-black text-orange-400">{cantAcuerdos}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <div className="bg-background/20 rounded p-3 text-center border border-border/30">
                                            <p className="text-[10px] uppercase text-text-secondary font-bold mb-1">Inscriptos</p>
                                            <p className="text-2xl font-black text-primary">{cantTotal}</p>
                                        </div>
                                        <div className="bg-background/20 rounded p-3 text-center border border-border/30">
                                            <p className="text-[10px] uppercase text-green-400/70 font-bold mb-1">Asistentes</p>
                                            <p className="text-2xl font-black text-green-400">{cantAsistentes}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-[10px]">
                                <span className="text-text-secondary uppercase italic">Click para gestionar inscriptos</span>
                                <div className="flex gap-1">
                                    {evento.esParaPadres && (
                                        <span className="font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                            Para Padres
                                        </span>
                                    )}
                                    <span className={`font-black uppercase px-2 py-0.5 rounded ${evento.tieneCosto ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                        {evento.tieneCosto ? 'Evento con Costo' : 'Gratuito'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title={editingEvent ? "Editar Evento" : "Crear Nuevo Evento"}>
                <form onSubmit={handleEventSubmit} className="space-y-4">
                    <InputField label="Tema / Título del Evento" name="tema" value={values.tema} onChange={handleInputChange} required />
                    <InputField label="Lugar" name="lugar" value={values.lugar} onChange={handleInputChange} required />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Fecha Inicio" name="fechaInicio" type="date" value={values.fechaInicio} onChange={handleInputChange} required />
                        <InputField label="Hora Inicio" name="horaInicio" type="time" value={values.horaInicio} onChange={handleInputChange} />
                        <InputField label="Fecha Fin" name="fechaFin" type="date" value={values.fechaFin} onChange={handleInputChange} />
                        <InputField label="Hora Fin" name="horaFin" type="time" value={values.horaFin} onChange={handleInputChange} />
                    </div>
                    <CheckboxField label="Este evento es para Padres/Tutores" name="esParaPadres" checked={values.esParaPadres} onChange={handleInputChange} />
                    <CheckboxField label="Este evento tiene costo de inscripción" name="tieneCosto" checked={values.tieneCosto} onChange={handleInputChange} />
                    {values.tieneCosto && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Costo Total Proyectado" name="costoTotal" type="number" value={values.costoTotal} onChange={handleInputChange} />
                            <InputField label="Costo por Persona" name="costoPersona" type="number" value={values.costoPersona} onChange={handleInputChange} required />
                        </div>
                    )}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-4">
                        <button type="button" onClick={() => setIsEventModalOpen(false)} className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-bold transition-all">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-indigo-700 font-bold shadow-lg transition-all">
                            {editingEvent ? 'Actualizar Evento' : 'Crear Evento'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación de Evento"
                message={<>¿Estás seguro de que deseas eliminar el evento <strong>{eventToDelete?.tema}</strong>? Esta acción es irreversible y borrará todos los pagos e inscripciones asociados.</>}
                confirmText="Eliminar Evento"
            />

            {selectedEvent && eventDetails && (
                <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={`Gestionar: ${selectedEvent.tema}`} size="3xl">
                    <div className="space-y-6">
                        <div className="flex border-b border-border">
                            <button onClick={() => setActiveTabModal('chicos')} className={`px-4 py-2 font-bold transition ${activeTabModal === 'chicos' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>{selectedEvent.esParaPadres ? 'Tutores' : 'Chicos'} ({eventDetails.inscritos.length})</button>
                            <button onClick={() => setActiveTabModal('servidores')} className={`px-4 py-2 font-bold transition ${activeTabModal === 'servidores' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Servidores Apoyo ({eventDetails.inscritosServidores.length})</button>
                        </div>

                        {activeTabModal === 'chicos' ? (
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-4 p-4 bg-background/30 rounded-lg border border-border/50">
                                    <div className="relative flex-1">
                                        <input type="text" placeholder="🔍 Buscar por nombre..." value={searchInscribedChico} onChange={(e) => setSearchInscribedChico(e.target.value)} className="w-full bg-background border border-border p-2 pl-10 rounded-md text-sm outline-none focus:ring-1 ring-primary" />
                                        <UsersIcon className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                                    </div>
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {selectedEvent.esParaPadres && (
                                            <button 
                                                onClick={async () => {
                                                    const promises = eventDetails.inscritos
                                                        .filter(i => !i.inscripcion.asistio)
                                                        .map(i => updateInscripcion({ ...i.inscripcion, asistio: true }));
                                                    await Promise.all(promises);
                                                }}
                                                className="bg-green-500/20 text-green-400 hover:bg-green-500/30 px-3 py-2 rounded-md border border-green-500/50 text-xs font-bold transition-colors"
                                            >
                                                Marcar todos Asistió
                                            </button>
                                        )}
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyDeudores} onChange={(e) => { setShowOnlyDeudores(e.target.checked); if(e.target.checked) setShowOnlyPagadosFull(false); }} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo con Deuda</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyPagadosFull} onChange={(e) => { setShowOnlyPagadosFull(e.target.checked); if(e.target.checked) setShowOnlyDeudores(false); }} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo Pagados</span>
                                        </label>
                                    </div>
                                </div>
                                {hasPermission('inscripciones_eventos', 'create') && (
                                    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-background/30 rounded-lg">
                                        <select value={adolescenteToInscribe} onChange={e => setAdolescenteToInscribe(e.target.value)} className="flex-1 bg-surface border border-border rounded-md p-2 text-sm">
                                            <option value="">-- Inscribir Nuevo {selectedEvent.esParaPadres ? 'Tutor' : 'Adolescente'} --</option>
                                            {eventDetails.noInscritos.map(ado => <option key={ado.id} value={ado.id}>{ado.nombre} {ado.apellido}</option>)}
                                        </select>
                                        <button onClick={() => { 
                                            if (selectedEvent && adolescenteToInscribe) {
                                                if (selectedEvent.esParaPadres) {
                                                    addInscripcion(selectedEvent.id, undefined, Number(adolescenteToInscribe));
                                                } else {
                                                    addInscripcion(selectedEvent.id, Number(adolescenteToInscribe), undefined);
                                                }
                                            }
                                            setAdolescenteToInscribe(''); 
                                        }} disabled={!adolescenteToInscribe} className="bg-primary text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap">Inscribir</button>
                                    </div>
                                )}
                                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {eventDetails.inscritos.map(item => (
                                        <div key={item.inscripcion.id} className="bg-background/20 p-4 rounded-lg border border-border">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-lg">{item.persona?.nombre} {item.persona?.apellido}</p>
                                                        {hasPermission('inscripciones_eventos', 'delete') && (
                                                            <button 
                                                                onClick={() => { setInscripcionToDelete(item.inscripcion); setIsDeleteInscripcionConfirmOpen(true); }}
                                                                className="text-red-500 hover:text-red-400 p-1"
                                                                title="Eliminar Inscripción"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {selectedEvent.tieneCosto && (
                                                        <p className="text-xs text-text-secondary">Pagado: {formatCurrency(item.totalPagado)} | Deuda: <span className={item.debe > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>{formatCurrency(item.debe)}</span></p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {selectedEvent.tieneCosto && (
                                                        <button onClick={() => toggleHistory('ado', item.inscripcion.id)} className={`text-[10px] uppercase font-black transition-colors ${expandedHistory[`ado-${item.inscripcion.id}`] ? 'text-text-primary' : 'text-primary hover:underline'}`}>
                                                            {expandedHistory[`ado-${item.inscripcion.id}`] ? 'Cerrar Historial' : 'Ver Historial'}
                                                        </button>
                                                    )}
                                                    {selectedEvent.esParaPadres && (
                                                        <label className="flex items-center gap-2 cursor-pointer bg-background/50 px-3 py-1.5 rounded-md border border-border/50 hover:bg-background/80 transition-colors">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={item.inscripcion.asistio || false} 
                                                                onChange={(e) => {
                                                                    updateInscripcion({ ...item.inscripcion, asistio: e.target.checked });
                                                                }}
                                                                className="h-4 w-4 text-green-500 rounded border-border focus:ring-green-500 bg-background"
                                                            />
                                                            <span className={`text-xs font-bold uppercase ${item.inscripcion.asistio ? 'text-green-400' : 'text-text-secondary'}`}>
                                                                {item.inscripcion.asistio ? 'Asistió' : 'No Asistió'}
                                                            </span>
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                            {expandedHistory[`ado-${item.inscripcion.id}`] && selectedEvent.tieneCosto && (
                                                <div className="mb-4 bg-background/50 rounded-lg border border-border/50 overflow-hidden animate-fade-in">
                                                    <table className="min-w-full text-[11px]">
                                                        <tbody className="divide-y divide-border/20">
                                                            {item.pagos.map(p => (
                                                                <tr key={p.id} className="hover:bg-primary/5">
                                                                    <td className="p-2 font-mono text-text-secondary">{formatDate(p.fecha)}</td>
                                                                    <td className="p-2 font-bold text-green-400">{formatCurrency(p.monto)}</td>
                                                                    <td className="p-2 italic text-text-secondary">{p.notas || '-'}</td>
                                                                    <td className="p-2 text-right">
                                                                        {hasPermission('pagos_eventos', 'delete') && (
                                                                            <button onClick={() => deletePago(p.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded transition-colors"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {item.pagos.length === 0 && <tr><td colSpan={4} className="p-4 text-center italic text-text-secondary">No hay pagos registrados.</td></tr>}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            {selectedEvent.tieneCosto && item.debe > 0 && hasPermission('pagos_eventos', 'create') && (
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="Monto" 
                                                            value={newPayment[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPayment({...newPayment, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <input 
                                                            type="date" 
                                                            value={newPaymentDate[item.inscripcion.id] || new Date().toISOString().split('T')[0]} 
                                                            onChange={e => setNewPaymentDate({...newPaymentDate, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="w-32 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Observaciones / Notas" 
                                                            value={newPaymentNote[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPaymentNote({...newPaymentNote, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <button 
                                                            onClick={() => handleAddPago(item.inscripcion.id)} 
                                                            disabled={isSavingPayment[item.inscripcion.id] || !newPayment[item.inscripcion.id]}
                                                            className={`bg-secondary text-white px-4 py-1 rounded text-sm font-bold shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2 ${isSavingPayment[item.inscripcion.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {isSavingPayment[item.inscripcion.id] ? <RefreshIcon className="w-4 h-4 animate-spin" /> : null}
                                                            Abonar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-4">
                                    <div className="relative flex-1 w-full">
                                        <input type="text" placeholder="🔍 Buscar servidor inscripto..." value={searchInscribedServidor} onChange={(e) => setSearchInscribedServidor(e.target.value)} className="w-full bg-background border border-border p-2 pl-10 rounded-md text-sm outline-none focus:ring-1 ring-primary" />
                                        <UsersIcon className="w-4 h-4 absolute left-3 top-3 text-text-secondary" />
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyBecados} onChange={(e) => setShowOnlyBecados(e.target.checked)} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo Becados</span>
                                        </label>
                                        <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer bg-background/40 px-3 py-2 rounded-md border border-border/50 hover:bg-background/60">
                                            <input type="checkbox" checked={showOnlyPrecioLocal} onChange={(e) => setShowOnlyPrecioLocal(e.target.checked)} className="h-4 w-4 text-primary rounded border-border" />
                                            <span>Solo Acuerdo Local</span>
                                        </label>
                                    </div>
                                </div>
                                {hasPermission('inscripciones_servidores', 'create') && (
                                    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-background/30 rounded-lg">
                                        <select value={servidorToInscribe} onChange={e => setServidorToInscribe(e.target.value)} className="flex-1 bg-surface border border-border rounded-md p-2 text-sm">
                                            <option value="">-- Seleccionar Servidor --</option>
                                            {eventDetails.noInscritosServidores.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido}</option>)}
                                        </select>
                                        <button onClick={handleTriggerInscripcionServidor} disabled={!servidorToInscribe} className="bg-primary text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 whitespace-nowrap">Inscribir</button>
                                    </div>
                                )}
                                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {eventDetails.inscritosServidores.map(item => (
                                        <div key={item.inscripcion.id} className="bg-background/20 p-4 rounded-lg border border-border">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-lg">{item.servidor!.nombre} {item.servidor!.apellido}</p>
                                                        <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded uppercase font-bold">{item.inscripcion.rol}</span>
                                                        {hasPermission('inscripciones_servidores', 'delete') && (
                                                            <button 
                                                                onClick={() => { setInscripcionServidorToDelete(item.inscripcion); setIsDeleteInscripcionServidorConfirmOpen(true); }}
                                                                className="text-red-500 hover:text-red-400 p-1"
                                                                title="Eliminar Inscripción Servidor"
                                                            >
                                                                <TrashIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-secondary mt-1">Pagado: {formatCurrency(item.totalPagado)} / Compromiso: {formatCurrency(item.costoEsperado)}{item.debe > 0 && <span className="ml-2 text-red-400 font-bold">Adeuda: {formatCurrency(item.debe)}</span>}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <button onClick={() => toggleHistory('ser', item.inscripcion.id)} className="text-[10px] text-primary font-black uppercase hover:underline">{expandedHistory[`ser-${item.inscripcion.id}`] ? 'Ocultar Pagos' : 'Historial Pagos'}</button>
                                                    <button onClick={() => handleOpenEditInscripcion(item.inscripcion)} className="text-[10px] text-indigo-400 uppercase font-bold hover:underline flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5" /> Editar</button>
                                                </div>
                                            </div>
                                            {expandedHistory[`ser-${item.inscripcion.id}`] && (
                                                <div className="my-3 bg-background/50 rounded-lg border border-border/50 overflow-hidden animate-fade-in">
                                                    <table className="min-w-full text-[11px]">
                                                        <tbody className="divide-y divide-border/20">
                                                            {item.pagos.map(p => (
                                                                <tr key={p.id} className="hover:bg-primary/5">
                                                                    <td className="p-2 font-mono text-text-secondary">{formatDate(p.fecha)}</td>
                                                                    <td className="p-2 font-bold text-green-400">{formatCurrency(p.monto)}</td>
                                                                    <td className="p-2 italic text-text-secondary">{p.notas || '-'}</td>
                                                                    <td className="p-2 text-right">
                                                                        {hasPermission('pagos_servidores', 'delete') && (
                                                                            <button onClick={() => deletePagoServidor(p.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded"><TrashIcon className="w-3.5 h-3.5" /></button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                            {item.inscripcion.tipoBeca !== 'Total' && item.debe > 0 && hasPermission('pagos_servidores', 'create') && (
                                                <div className="space-y-2 mt-3">
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="number" 
                                                            placeholder="Monto" 
                                                            value={newPaymentServidor[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPaymentServidor({...newPaymentServidor, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <input 
                                                            type="date" 
                                                            value={newPaymentDateServidor[item.inscripcion.id] || new Date().toISOString().split('T')[0]} 
                                                            onChange={e => setNewPaymentDateServidor({...newPaymentDateServidor, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="w-32 bg-surface border border-border p-1.5 text-sm rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Observaciones / Notas" 
                                                            value={newPaymentNoteServidor[item.inscripcion.id] || ''} 
                                                            onChange={e => setNewPaymentNoteServidor({...newPaymentNoteServidor, [item.inscripcion.id]: e.target.value})} 
                                                            disabled={isSavingPayment[item.inscripcion.id]}
                                                            className="flex-1 bg-surface border border-border p-1.5 text-xs rounded outline-none focus:ring-1 ring-primary disabled:opacity-50" 
                                                        />
                                                        <button 
                                                            onClick={() => handleAddPagoServidor(item.inscripcion.id)} 
                                                            disabled={isSavingPayment[item.inscripcion.id] || !newPaymentServidor[item.inscripcion.id]}
                                                            className={`bg-secondary text-white px-4 py-1 rounded text-sm font-bold shadow-md hover:bg-emerald-600 transition-colors flex items-center gap-2 ${isSavingPayment[item.inscripcion.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {isSavingPayment[item.inscripcion.id] ? <RefreshIcon className="w-4 h-4 animate-spin" /> : null}
                                                            Abonar
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-4 border-t border-border">
                            <div>
                                {selectedEvent.finalizado ? (
                                    <button 
                                        onClick={() => updateEvento({ ...selectedEvent, finalizado: false }).then(() => setSelectedEvent({ ...selectedEvent, finalizado: false }))} 
                                        className="bg-yellow-500/20 text-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-500/30 font-bold border border-yellow-500/50 transition-colors"
                                    >
                                        Reabrir Evento
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => updateEvento({ ...selectedEvent, finalizado: true }).then(() => setSelectedEvent({ ...selectedEvent, finalizado: true }))} 
                                        className="bg-red-500/20 text-red-500 px-4 py-2 rounded-lg hover:bg-red-500/30 font-bold border border-red-500/50 transition-colors"
                                    >
                                        Finalizar Evento
                                    </button>
                                )}
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-bold">Cerrar Gestión</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL PARA INDICAR CONDICIONES AL INSCRIBIR NUEVO SERVIDOR */}
            <Modal isOpen={isAddConditionsModalOpen} onClose={() => setIsAddConditionsModalOpen(false)} title="Condiciones de Inscripción">
                <div className="space-y-4">
                    <div className="bg-background/50 p-4 rounded-lg mb-4 border border-border/50">
                        <p className="text-xs font-bold text-primary uppercase">Inscribiendo a:</p>
                        <p className="text-xl font-bold">
                            {servidores.find(s => s.id === Number(servidorToInscribe))?.nombre} {servidores.find(s => s.id === Number(servidorToInscribe))?.apellido}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Rol en el Evento</label>
                            <select 
                                value={rolServidorToInscribe} 
                                onChange={e => setRolServidorToInscribe(e.target.value as RolServidor)}
                                className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary text-sm"
                            >
                                <option value="Pastor">Pastor</option>
                                <option value="Lider de Color">Lider de Color</option>
                                <option value="Lider de Campamento">Lider de Campamento</option>
                                <option value="Cuidador">Cuidador</option>
                                <option value="Cocina">Cocina</option>
                                <option value="Apoyo">Apoyo</option>
                                <option value="Alabanza">Alabanza</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Tipo de Beca</label>
                            <select 
                                value={becaServidorToInscribe} 
                                onChange={e => setBecaServidorToInscribe(e.target.value as TipoBeca)}
                                className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary text-sm"
                            >
                                <option value="Ninguna">Ninguna</option>
                                <option value="Parcial">Beca Parcial</option>
                                <option value="Total">Beca Total (100%)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 bg-background/20 rounded-lg border border-border/40">
                        <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                            <input 
                                type="checkbox" 
                                id="chk-local-new"
                                checked={precioEspecialToInscribe} 
                                onChange={e => setPrecioEspecialToInscribe(e.target.checked)}
                                className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background"
                            />
                            <label htmlFor="chk-local-new" className="text-sm font-bold text-orange-400 cursor-pointer">Precio Acuerdo Local</label>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                            <input 
                                type="checkbox" 
                                id="chk-church-new"
                                checked={iglesiaPagaSaldoToInscribe} 
                                onChange={e => setIglesiaPagaSaldoToInscribe(e.target.checked)}
                                className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background"
                            />
                            <label htmlFor="chk-church-new" className="text-sm font-bold text-blue-400 cursor-pointer">Iglesia paga saldo</label>
                        </div>
                    </div>

                    {(becaServidorToInscribe === 'Parcial' || precioEspecialToInscribe) && (
                        <InputField 
                            label="Monto Acordado (Su compromiso a pagar)" 
                            type="number" 
                            value={montoServidorToInscribe} 
                            onChange={e => setMontoServidorToInscribe(e.target.value)}
                        />
                    )}

                    <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                        <button type="button" onClick={() => setIsAddConditionsModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg font-bold">Cancelar</button>
                        <button onClick={handleAddInscripcionServidorConfirm} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-all hover:bg-indigo-700">Confirmar e Inscribir</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isEditInscripcionModalOpen} onClose={() => setIsEditInscripcionModalOpen(false)} title="Editar Condiciones del Servidor">
                {editingInscripcion && (
                    <form onSubmit={handleUpdateInscripcionSubmit} className="space-y-4">
                        <div className="bg-background/50 p-4 rounded-lg mb-4 border border-border/50">
                            <p className="text-xs font-bold text-primary uppercase">Servidor:</p>
                            <p className="text-xl font-bold">{servidores.find(s => s.id === editingInscripcion.servidorId)?.nombre} {servidores.find(s => s.id === editingInscripcion.servidorId)?.apellido}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary">Tipo de Beca</label>
                            <select value={editingInscripcion.tipoBeca} onChange={e => setEditingInscripcion({...editingInscripcion, tipoBeca: e.target.value as TipoBeca})} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:ring-primary text-text-primary text-sm">
                                <option value="Ninguna">Ninguna</option>
                                <option value="Parcial">Beca Parcial</option>
                                <option value="Total">Beca Total (100%)</option>
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2 p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="chk-local-edit"
                                    checked={editingInscripcion.precioEspecialLocal} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, precioEspecialLocal: e.target.checked})} 
                                    className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background" 
                                />
                                <label htmlFor="chk-local-edit" className="text-sm font-bold text-orange-400 cursor-pointer">Precio Acuerdo Local</label>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                                <input 
                                    type="checkbox" 
                                    id="chk-church-edit"
                                    checked={editingInscripcion.iglesiaPagaSaldo} 
                                    onChange={e => setEditingInscripcion({...editingInscripcion, iglesiaPagaSaldo: e.target.checked})} 
                                    className="h-5 w-5 text-primary rounded border-border focus:ring-primary bg-background" 
                                />
                                <label htmlFor="chk-church-edit" className="text-sm font-bold text-blue-400 cursor-pointer">Iglesia paga saldo</label>
                            </div>
                        </div>

                        {(editingInscripcion.tipoBeca === 'Parcial' || editingInscripcion.precioEspecialLocal) && (
                            <InputField label="Monto Acordado (Su compromiso)" type="number" value={editingInscripcion.montoAcordado || 0} onChange={e => setEditingInscripcion({...editingInscripcion, montoAcordado: Number(e.target.value)})} />
                        )}
                        <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                            <button type="button" onClick={() => setIsEditInscripcionModalOpen(false)} className="bg-gray-600 text-white px-5 py-2 rounded-lg font-bold">Cancelar</button>
                            <button type="submit" className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold shadow-lg transition-all hover:bg-indigo-700">Actualizar</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Modales de Confirmación para eliminar inscripciones */}
            <ConfirmationModal
                isOpen={isDeleteInscripcionConfirmOpen}
                onClose={() => setIsDeleteInscripcionConfirmOpen(false)}
                onConfirm={handleConfirmDeleteInscripcion}
                title="Quitar Adolescente del Evento"
                message={<>¿Estás seguro de que quieres quitar al adolescente del evento? Se perderán también sus pagos registrados en este evento.</>}
                confirmText="Quitar del Evento"
            />

            <ConfirmationModal
                isOpen={isDeleteInscripcionServidorConfirmOpen}
                onClose={() => setIsDeleteInscripcionServidorConfirmOpen(false)}
                onConfirm={handleConfirmDeleteInscripcionServidor}
                title="Quitar Servidor del Evento"
                message={<>¿Estás seguro de que quieres quitar a este servidor del evento? Se perderán también sus pagos registrados en este evento.</>}
                confirmText="Quitar del Evento"
            />
        </div>
    );
};

export default Eventos;
