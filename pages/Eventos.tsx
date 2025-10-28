import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Evento, Adolescente, InscripcionEvento, PagoEvento } from '../types';
import { formatDate, formatCurrency } from '../utils/helpers';
import Modal from '../components/ui/Modal';

const Eventos: React.FC = () => {
    const { 
        eventos, adolescentes, inscripciones, pagos, participantes,
        addInscripcion, updateInscripcion, deleteInscripcion, addPago, deletePago,
        addParticipante, removeParticipante
    } = useData();
    const { hasPermission } = useAuth();
    const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);
    const [adolescenteToInscribe, setAdolescenteToInscribe] = useState<string>('');
    const [newPayment, setNewPayment] = useState<{ [key: number]: string }>({});
    const [editingNotes, setEditingNotes] = useState<{ [inscripcionId: number]: string }>({});


    const closeModal = () => setSelectedEvent(null);

    const eventDetails = useMemo(() => {
        if (!selectedEvent) return null;
        
        const eventInscripciones = inscripciones.filter(i => i.eventoId === selectedEvent.id);
        const eventParticipantesIds = participantes.filter(p => p.eventoId === selectedEvent.id).map(p => p.adolescenteId);
        
        const adolescentesInscritos = eventInscripciones.map(inscripcion => {
            const ado = adolescentes.find(a => a.id === inscripcion.adolescenteId);
            const pagosRealizados = pagos.filter(p => p.inscripcionId === inscripcion.id);
            const totalPagado = pagosRealizados.reduce((sum, p) => sum + p.monto, 0);
            return {
                adolescente: ado,
                inscripcion: inscripcion,
                totalPagado,
                pagos: pagosRealizados,
                debe: (selectedEvent.costoPersona || 0) - totalPagado,
                esParticipante: eventParticipantesIds.includes(inscripcion.adolescenteId),
            };
        }).filter(item => item.adolescente);

        const adolescentesNoInscritos = adolescentes.filter(a => 
            a.estado === 'Activo' && !eventInscripciones.some(i => i.adolescenteId === a.id)
        );

        const totalRecaudado = adolescentesInscritos.reduce((sum, inscrito) => sum + inscrito.totalPagado, 0);
        const costoTotalEsperado = adolescentesInscritos.length * (selectedEvent.costoPersona || 0);

        return {
            inscritos: adolescentesInscritos,
            noInscritos: adolescentesNoInscritos,
            summary: {
                totalRecaudado,
                costoTotalEsperado,
                saldoPendiente: costoTotalEsperado - totalRecaudado,
            }
        };
    }, [selectedEvent, adolescentes, inscripciones, pagos, participantes]);

    const handleAddInscripcion = async () => {
        if (selectedEvent && adolescenteToInscribe) {
            await addInscripcion(selectedEvent.id, Number(adolescenteToInscribe));
            setAdolescenteToInscribe('');
        }
    };

    const handleAddPago = async (inscripcionId: number) => {
        const monto = parseFloat(newPayment[inscripcionId] || '0');
        if (monto > 0) {
            await addPago(inscripcionId, monto);
            setNewPayment(prev => ({ ...prev, [inscripcionId]: '' }));
        }
    };
    
    const handleNoteChange = (inscripcionId: number, text: string) => {
        setEditingNotes(prev => ({
            ...prev,
            [inscripcionId]: text,
        }));
    };

    const handleNoteSave = async (inscripcion: InscripcionEvento) => {
        const newNotes = editingNotes[inscripcion.id];
        // Only update if notes have actually changed
        if (newNotes !== undefined && newNotes !== (inscripcion.notas ?? '')) {
            await updateInscripcion({ ...inscripcion, notas: newNotes });
            // Clear the editing state for this item after saving
            setEditingNotes(prev => {
                const newState = { ...prev };
                delete newState[inscripcion.id];
                return newState;
            });
        }
    };

    const handleToggleParticipante = async (adolescenteId: number, esParticipante: boolean) => {
        if (!selectedEvent) return;
        if (esParticipante) {
            await removeParticipante(selectedEvent.id, adolescenteId);
        } else {
            await addParticipante(selectedEvent.id, adolescenteId);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Gestión de Eventos</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventos.map(evento => (
                    <div key={evento.id} className="bg-surface p-5 rounded-lg shadow-lg flex flex-col justify-between cursor-pointer hover:ring-2 ring-primary transition-all" onClick={() => setSelectedEvent(evento)}>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary mb-2">{evento.tema}</h2>
                            <p className="text-sm text-text-secondary">{evento.lugar}</p>
                            <p className="text-sm text-text-secondary">{formatDate(evento.fechaInicio)} al {formatDate(evento.fechaFin)}</p>
                        </div>
                        <div className="mt-4">
                            {evento.tieneCosto ? (
                                <p className="font-bold text-secondary">{formatCurrency(evento.costoPersona || 0)} por persona</p>
                            ) : (
                                <p className="font-bold text-green-400">Gratuito</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {selectedEvent && eventDetails && (
                <Modal isOpen={!!selectedEvent} onClose={closeModal} title={`Gestionar: ${selectedEvent.tema}`} size="3xl">
                    <div className="space-y-6">
                        {/* Resumen Financiero */}
                        {selectedEvent.tieneCosto && eventDetails.summary && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-background/50 p-4 rounded-lg text-center border border-border">
                                <div>
                                    <p className="text-sm text-text-secondary uppercase tracking-wider">Total Esperado</p>
                                    <p className="text-2xl font-bold text-text-primary">{formatCurrency(eventDetails.summary.costoTotalEsperado)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary uppercase tracking-wider">Total Recaudado</p>
                                    <p className="text-2xl font-bold text-green-400">{formatCurrency(eventDetails.summary.totalRecaudado)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-text-secondary uppercase tracking-wider">Saldo Pendiente</p>
                                    <p className="text-2xl font-bold text-yellow-400">{formatCurrency(eventDetails.summary.saldoPendiente)}</p>
                                </div>
                            </div>
                        )}

                        {/* Inscripción */}
                        {hasPermission('eventos', 'create') && (
                            <div className="bg-background/50 p-4 rounded-lg">
                                <h3 className="font-bold mb-2">Inscribir Adolescente</h3>
                                <div className="flex gap-2">
                                    <select value={adolescenteToInscribe} onChange={e => setAdolescenteToInscribe(e.target.value)} className="flex-grow bg-surface border-border rounded-md p-2">
                                        <option value="">Seleccionar adolescente...</option>
                                        {eventDetails.noInscritos.map(ado => <option key={ado.id} value={ado.id}>{ado.nombre} {ado.apellido}</option>)}
                                    </select>
                                    <button onClick={handleAddInscripcion} disabled={!adolescenteToInscribe} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Inscribir</button>
                                </div>
                            </div>
                        )}

                        {/* Tabla de Inscritos */}
                        <div>
                            <h3 className="font-bold text-lg mb-2">Inscritos ({eventDetails.inscritos.length})</h3>
                            <div className="bg-background rounded-md max-h-96 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-surface sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">Adolescente</th>
                                            <th className="p-2 text-left">Financiero y Notas</th>
                                            <th className="p-2 text-center">Participante</th>
                                            <th className="p-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {eventDetails.inscritos.map(inscrito => (
                                            <tr key={inscrito.inscripcion.id}>
                                                <td className="p-2 font-semibold align-top">{inscrito.adolescente!.nombre} {inscrito.adolescente!.apellido}</td>
                                                <td className="p-2 align-top">
                                                    <div className="flex flex-col h-full justify-between">
                                                        {/* Financial Section */}
                                                        <div>
                                                            {selectedEvent.tieneCosto && (
                                                                <div className="space-y-2">
                                                                    {/* Summary */}
                                                                    <div>
                                                                        <p className={`font-semibold ${inscrito.debe > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                                            {formatCurrency(inscrito.totalPagado)} / {formatCurrency(selectedEvent.costoPersona || 0)}
                                                                        </p>
                                                                        {inscrito.debe > 0 && (
                                                                            <p className="text-xs text-red-400">Debe: {formatCurrency(inscrito.debe)}</p>
                                                                        )}
                                                                    </div>
                                                                    {/* Payment History */}
                                                                    {inscrito.pagos.length > 0 && (
                                                                        <div className="text-xs text-text-secondary">
                                                                            <p className="font-bold">Historial de Pagos:</p>
                                                                            <div className="space-y-1 mt-1 pl-2 border-l-2 border-border">
                                                                                {inscrito.pagos.map(p => (
                                                                                    <div key={p.id} className="flex justify-between items-center group">
                                                                                        <span>{formatCurrency(p.monto)} <span className="text-gray-500">({formatDate(p.fecha)})</span></span>
                                                                                        {hasPermission('eventos', 'delete') &&
                                                                                            <button onClick={() => deletePago(p.id)} className="text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 text-lg font-bold leading-none p-1 rounded-full hover:bg-red-500/20 w-5 h-5 flex items-center justify-center">
                                                                                                &times;
                                                                                            </button>
                                                                                        }
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {/* Add Payment Form */}
                                                                    {hasPermission('eventos', 'create') && (
                                                                        <div className="flex gap-1 pt-1">
                                                                            <input type="number" placeholder="Monto" value={newPayment[inscrito.inscripcion.id] || ''} onChange={e => setNewPayment(p => ({...p, [inscrito.inscripcion.id]: e.target.value}))} className="w-24 bg-surface border-border rounded-md p-1 text-xs" />
                                                                            <button onClick={() => handleAddPago(inscrito.inscripcion.id)} className="bg-secondary text-white px-2 py-0.5 rounded text-xs">Añadir Pago</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* Notes Section */}
                                                        <div>
                                                            {hasPermission('eventos', 'update') && (
                                                                <div className="mt-2">
                                                                    <label className="text-xs font-bold text-text-secondary">Notas:</label>
                                                                    <textarea
                                                                        value={editingNotes[inscrito.inscripcion.id] ?? inscrito.inscripcion.notas ?? ''}
                                                                        onChange={(e) => handleNoteChange(inscrito.inscripcion.id, e.target.value)}
                                                                        onBlur={() => handleNoteSave(inscrito.inscripcion)}
                                                                        className="w-full bg-surface border border-border rounded-md p-1 text-xs mt-1 text-text-primary"
                                                                        rows={2}
                                                                        placeholder="Alergias, transporte, etc."
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center align-top">
                                                    {hasPermission('eventos', 'update') ? (
                                                        <button onClick={() => handleToggleParticipante(inscrito.adolescente!.id, inscrito.esParticipante)} className={`px-2 py-1 text-xs rounded-full ${inscrito.esParticipante ? 'bg-green-500' : 'bg-gray-600'}`}>
                                                            {inscrito.esParticipante ? 'Sí' : 'No'}
                                                        </button>
                                                    ) : (
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inscrito.esParticipante ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                             {inscrito.esParticipante ? 'Sí' : 'No'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right align-top">
                                                    {hasPermission('eventos', 'delete') && <button onClick={() => deleteInscripcion(inscrito.inscripcion.id)} className="text-red-500 hover:text-red-400 text-xs">Eliminar Inscripción</button>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                         <div className="flex justify-end pt-4">
                            <button type="button" onClick={closeModal} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cerrar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Eventos;