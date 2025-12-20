import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Devocional, EntregaDevocional, Adolescente } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { formatDate } from '../utils/helpers';
import { BookOpenIcon, CheckCircleIcon, TrashIcon, PencilIcon, RefreshIcon } from '../components/ui/Icons';

type Tab = 'gestion' | 'registro' | 'historial';

const Tareas: React.FC = () => {
    const { devocionales, entregasDevocionales, adolescentes, addDevocional, updateDevocional, deleteDevocional, registrarEntregaBulk, deleteEntrega, updateEntrega } = useData();
    const { hasPermission } = useAuth();
    
    const [activeTab, setActiveTab] = useState<Tab>('registro');
    
    // --- State for Tab Gestion (Definitions) ---
    const [isDevocionalModalOpen, setIsDevocionalModalOpen] = useState(false);
    const [editingDevocional, setEditingDevocional] = useState<Devocional | null>(null);
    const [devocionalToDelete, setDevocionalToDelete] = useState<Devocional | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    // --- State for Tab Registro (Submissions) ---
    const [selectedAdolescenteId, setSelectedAdolescenteId] = useState<number | string>('');
    const [selectedDevocionalIds, setSelectedDevocionalIds] = useState<Set<number>>(new Set());
    const [fechaEntrega, setFechaEntrega] = useState<string>(new Date().toISOString().split('T')[0]);
    const [observaciones, setObservaciones] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // --- State for Tab Historial (Filters & Table) ---
    const [filterAdo, setFilterAdo] = useState<string>('');
    const [filterDev, setFilterDev] = useState<string>('');
    const [filterDateStart, setFilterDateStart] = useState<string>('');
    const [filterDateEnd, setFilterDateEnd] = useState<string>('');
    
    const [isDeleteEntregaConfirmOpen, setIsDeleteEntregaConfirmOpen] = useState(false);
    const [entregaToDelete, setEntregaToDelete] = useState<EntregaDevocional | null>(null);
    const [isEditEntregaModalOpen, setIsEditEntregaModalOpen] = useState(false);
    const [editingEntrega, setEditingEntrega] = useState<EntregaDevocional | null>(null);
    const [editSubmissionValues, setEditSubmissionValues] = useState({
        adolescenteId: '',
        devocionalId: '',
        fechaEntrega: '',
        observaciones: ''
    });

    const initialFormState: Omit<Devocional, 'id'> = {
        numeroSemana: 0,
        tema: '',
        fechaDistribucion: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
    };

    const { values, handleInputChange, setValues, resetForm } = useForm(initialFormState);

    // --- Handlers for Gestion (Devocionales Definition) ---
    const openModalForCreate = () => {
        setEditingDevocional(null);
        resetForm();
        setValues(prev => ({...prev, numeroSemana: devocionales.length + 1}));
        setIsDevocionalModalOpen(true);
    };

    const openModalForEdit = (d: Devocional) => {
        setEditingDevocional(d);
        setValues(d);
        setIsDevocionalModalOpen(true);
    };

    const handleSubmitDevocional = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = { ...values };
        if (editingDevocional) {
            await updateDevocional({ ...payload, id: editingDevocional.id });
        } else {
            await addDevocional(payload);
        }
        setIsDevocionalModalOpen(false);
    };

    const handleDeleteClick = (d: Devocional) => {
        setDevocionalToDelete(d);
        setIsDeleteConfirmOpen(true);
    }
    
    const handleConfirmDelete = async () => {
        if(devocionalToDelete) {
            await deleteDevocional(devocionalToDelete.id);
            setDevocionalToDelete(null);
            setIsDeleteConfirmOpen(false);
        }
    }

    // --- Handlers for Registro (New Submissions) ---
    const handleToggleDevocional = (id: number) => {
        setSelectedDevocionalIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleRegistrarEntrega = async () => {
        if (!selectedAdolescenteId) {
            alert("Seleccione un adolescente");
            return;
        }
        if (selectedDevocionalIds.size === 0) {
            alert("Seleccione al menos un devocional");
            return;
        }

        const entregas: Omit<EntregaDevocional, 'id'>[] = Array.from(selectedDevocionalIds).map((devId: number) => ({
            devocionalId: devId,
            adolescenteId: Number(selectedAdolescenteId),
            fechaEntrega: fechaEntrega,
            observaciones: observaciones
        }));

        try {
            await registrarEntregaBulk(entregas);
            setSuccessMessage("¡Entregas registradas con éxito!");
            setSelectedDevocionalIds(new Set());
            setObservaciones('');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            alert("Error al registrar entregas.");
            console.error(error);
        }
    };
    
    // --- Handlers for Historial (Filters, Delete, Edit) ---
    const clearFilters = () => {
        setFilterAdo('');
        setFilterDev('');
        setFilterDateStart('');
        setFilterDateEnd('');
    };

    const handleDeleteEntrega = (entrega: EntregaDevocional) => {
        setEntregaToDelete(entrega);
        setIsDeleteEntregaConfirmOpen(true);
    }

    const handleConfirmDeleteEntrega = async () => {
        if (entregaToDelete) {
            await deleteEntrega(entregaToDelete.id);
            setIsDeleteEntregaConfirmOpen(false);
            setEntregaToDelete(null);
        }
    }

    const handleEditEntrega = (entrega: EntregaDevocional) => {
        setEditingEntrega(entrega);
        setEditSubmissionValues({
            adolescenteId: String(entrega.adolescenteId),
            devocionalId: String(entrega.devocionalId),
            fechaEntrega: entrega.fechaEntrega,
            observaciones: entrega.observaciones || ''
        });
        setIsEditEntregaModalOpen(true);
    }

    const handleSaveEditedEntrega = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingEntrega) {
            const updated: EntregaDevocional = {
                id: editingEntrega.id,
                adolescenteId: Number(editSubmissionValues.adolescenteId),
                devocionalId: Number(editSubmissionValues.devocionalId),
                fechaEntrega: editSubmissionValues.fechaEntrega,
                observaciones: editSubmissionValues.observaciones
            };
            await updateEntrega(updated);
            setIsEditEntregaModalOpen(false);
            setEditingEntrega(null);
        }
    }

    // --- Computed Data ---
    const sortedDevocionales = useMemo(() => 
        [...devocionales].sort((a,b) => b.numeroSemana - a.numeroSemana), 
    [devocionales]);
    
    const filteredEntregas = useMemo(() => {
        return entregasDevocionales
            .filter(ent => {
                const matchAdo = filterAdo === '' || ent.adolescenteId === Number(filterAdo);
                const matchDev = filterDev === '' || ent.devocionalId === Number(filterDev);
                
                let matchDate = true;
                if (filterDateStart) {
                    matchDate = matchDate && new Date(ent.fechaEntrega) >= new Date(filterDateStart);
                }
                if (filterDateEnd) {
                    matchDate = matchDate && new Date(ent.fechaEntrega) <= new Date(filterDateEnd);
                }
                
                return matchAdo && matchDev && matchDate;
            })
            .sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
    }, [entregasDevocionales, filterAdo, filterDev, filterDateStart, filterDateEnd]);

    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpenIcon className="w-8 h-8 text-primary" />
                Gestión de Tareas y Devocionales
            </h1>

            <div className="flex border-b border-border overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('registro')} 
                    className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'registro' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Registrar Entregas
                </button>
                <button 
                    onClick={() => setActiveTab('gestion')} 
                    className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'gestion' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Definir Devocionales
                </button>
                <button 
                    onClick={() => setActiveTab('historial')} 
                    className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'historial' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Historial de Entregas
                </button>
            </div>

            {/* TAB: REGISTRO DE ENTREGAS */}
            {activeTab === 'registro' && (
                <div className="bg-surface p-6 rounded-lg shadow-lg animate-fade-in">
                    {successMessage && (
                        <div className="mb-4 bg-green-500/20 text-green-300 p-3 rounded flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5"/> {successMessage}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-text-primary">1. Seleccionar Datos</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Adolescente</label>
                                    <select 
                                        value={selectedAdolescenteId} 
                                        onChange={(e) => setSelectedAdolescenteId(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md p-2"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {adolescentes.filter(a => a.estado === 'Activo').map(a => (
                                            <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Fecha de Devolución</label>
                                    <input 
                                        type="date" 
                                        value={fechaEntrega} 
                                        onChange={(e) => setFechaEntrega(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Observaciones (Opcional)</label>
                                    <textarea 
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md p-2"
                                        rows={3}
                                    />
                                </div>
                                <button 
                                    onClick={handleRegistrarEntrega}
                                    className="w-full bg-primary text-white py-2 rounded-md hover:bg-indigo-700 transition font-bold shadow-lg"
                                >
                                    Guardar Entrega
                                </button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-text-primary">2. Seleccionar Hojas Entregadas</h2>
                            <div className="bg-background rounded-md border border-border overflow-hidden h-96 overflow-y-auto custom-scrollbar">
                                {sortedDevocionales.length === 0 ? (
                                    <p className="p-4 text-text-secondary text-center">No hay devocionales definidos.</p>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {sortedDevocionales.map(dev => {
                                            const isSelected = selectedDevocionalIds.has(dev.id);
                                            // Check if this specific teen already submitted this specific devotional
                                            const alreadySubmitted = selectedAdolescenteId ? entregasDevocionales.some(e => e.devocionalId === dev.id && e.adolescenteId === Number(selectedAdolescenteId)) : false;

                                            return (
                                                <div 
                                                    key={dev.id} 
                                                    onClick={() => !alreadySubmitted && handleToggleDevocional(dev.id)}
                                                    className={`p-3 flex items-start gap-3 cursor-pointer hover:bg-surface transition ${isSelected ? 'bg-primary/10' : ''} ${alreadySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isSelected} 
                                                        disabled={alreadySubmitted}
                                                        onChange={() => {}} // handled by div click
                                                        className="mt-1 h-4 w-4 text-primary rounded border-gray-600 focus:ring-primary bg-background"
                                                    />
                                                    <div>
                                                        <p className="font-semibold text-text-primary">Semana {dev.numeroSemana}: {dev.tema}</p>
                                                        <p className="text-xs text-text-secondary">Vence: {formatDate(dev.fechaVencimiento)}</p>
                                                        {alreadySubmitted && <span className="text-xs text-green-400 font-bold">Ya entregado</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: GESTION DE DEVOCIONALES */}
            {activeTab === 'gestion' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md">
                            + Nuevo Devocional
                        </button>
                    </div>
                    <div className="bg-surface shadow-lg rounded-lg overflow-x-auto border border-border">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-background">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Semana</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Tema</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Entregado el</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Vence el</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedDevocionales.map(dev => (
                                    <tr key={dev.id} className="hover:bg-background/50 transition-colors">
                                        <td className="px-6 py-4">{dev.numeroSemana}</td>
                                        <td className="px-6 py-4 font-bold">{dev.tema}</td>
                                        <td className="px-6 py-4 text-sm">{formatDate(dev.fechaDistribucion)}</td>
                                        <td className="px-6 py-4 text-sm">{formatDate(dev.fechaVencimiento)}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button onClick={() => openModalForEdit(dev)} className="text-primary hover:text-indigo-300">Editar</button>
                                            <button onClick={() => handleDeleteClick(dev)} className="text-red-500 hover:text-red-300">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: HISTORIAL */}
            {activeTab === 'historial' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Barra de Filtros */}
                    <div className="bg-surface p-4 rounded-lg shadow-lg border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Adolescente</label>
                            <select 
                                value={filterAdo} 
                                onChange={(e) => setFilterAdo(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm"
                            >
                                <option value="">Todos</option>
                                {adolescentes.map(a => (
                                    <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Devocional</label>
                            <select 
                                value={filterDev} 
                                onChange={(e) => setFilterDev(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm"
                            >
                                <option value="">Todos</option>
                                {sortedDevocionales.map(d => (
                                    <option key={d.id} value={d.id}>Sem {d.numeroSemana}: {d.tema}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Desde</label>
                            <input 
                                type="date" 
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Hasta</label>
                            <input 
                                type="date" 
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                className="w-full bg-background border border-border rounded-md p-2 text-sm"
                            />
                        </div>
                        <div>
                            <button 
                                onClick={clearFilters}
                                className="w-full bg-gray-700 text-text-primary hover:bg-gray-600 p-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <RefreshIcon className="w-4 h-4"/> Limpiar
                            </button>
                        </div>
                    </div>

                    <div className="bg-surface shadow-lg rounded-lg overflow-x-auto border border-border">
                         <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha Devolución</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Adolescente</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Devocional</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Observación</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredEntregas.map(ent => {
                                        const ado = adolescentes.find(a => a.id === ent.adolescenteId);
                                        const dev = devocionales.find(d => d.id === ent.devocionalId);
                                        return (
                                            <tr key={ent.id} className="hover:bg-background/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">{formatDate(ent.fechaEntrega)}</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">{ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">{dev ? `Sem ${dev.numeroSemana}: ${dev.tema}` : 'Borrado'}</td>
                                                <td className="px-6 py-4 text-sm text-text-secondary">{ent.observaciones || '-'}</td>
                                                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                    <button onClick={() => handleEditEntrega(ent)} className="text-primary hover:text-indigo-300 p-1" title="Editar registro">
                                                        <PencilIcon className="w-4 h-4 inline" />
                                                    </button>
                                                    <button onClick={() => handleDeleteEntrega(ent)} className="text-red-500 hover:text-red-300 p-1" title="Eliminar registro">
                                                        <TrashIcon className="w-4 h-4 inline"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredEntregas.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-text-secondary italic">No se encontraron entregas con los filtros actuales.</td></tr>
                                    )}
                                </tbody>
                            </table>
                    </div>
                </div>
            )}

            {/* Modal para Crear/Editar Definición de Devocional */}
            <Modal isOpen={isDevocionalModalOpen} onClose={() => setIsDevocionalModalOpen(false)} title={editingDevocional ? 'Editar Tarea' : 'Nueva Tarea'}>
                <form onSubmit={handleSubmitDevocional} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Número de Semana</label>
                            <input 
                                type="number" 
                                name="numeroSemana" 
                                value={values.numeroSemana} 
                                onChange={handleInputChange} 
                                required
                                className="w-full bg-background border border-border rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Tema</label>
                            <input 
                                type="text" 
                                name="tema" 
                                value={values.tema} 
                                onChange={handleInputChange} 
                                required
                                className="w-full bg-background border border-border rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Fecha Distribución</label>
                            <input 
                                type="date" 
                                name="fechaDistribucion" 
                                value={values.fechaDistribucion} 
                                onChange={handleInputChange} 
                                required
                                className="w-full bg-background border border-border rounded-md px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Fecha Vencimiento (Opcional)</label>
                            <input 
                                type="date" 
                                name="fechaVencimiento" 
                                value={values.fechaVencimiento || ''} 
                                onChange={handleInputChange} 
                                className="w-full bg-background border border-border rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                        <button type="button" onClick={() => setIsDevocionalModalOpen(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">Guardar</button>
                    </div>
                </form>
            </Modal>
            
            {/* Modal para Editar Entrega (Historial) */}
            <Modal isOpen={isEditEntregaModalOpen} onClose={() => setIsEditEntregaModalOpen(false)} title="Editar Registro de Entrega">
                <form onSubmit={handleSaveEditedEntrega} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Adolescente</label>
                        <select 
                            value={editSubmissionValues.adolescenteId}
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, adolescenteId: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2"
                            required
                        >
                            {adolescentes.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre} {a.apellido}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Devocional / Hoja</label>
                        <select 
                            value={editSubmissionValues.devocionalId}
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, devocionalId: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2"
                            required
                        >
                            {sortedDevocionales.map(d => (
                                <option key={d.id} value={d.id}>Sem {d.numeroSemana}: {d.tema}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Fecha de Entrega</label>
                        <input 
                            type="date" 
                            value={editSubmissionValues.fechaEntrega}
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, fechaEntrega: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">Observaciones</label>
                        <textarea 
                            value={editSubmissionValues.observaciones}
                            onChange={(e) => setEditSubmissionValues({...editSubmissionValues, observaciones: e.target.value})}
                            className="w-full bg-background border border-border rounded-md p-2"
                            rows={3}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-border mt-4">
                        <button type="button" onClick={() => setIsEditEntregaModalOpen(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">Guardar Cambios</button>
                    </div>
                </form>
            </Modal>

             {/* Confirmation for Definition Deletion */}
             <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Devocional"
                message={<>¿Estás seguro de que deseas eliminar el devocional <strong>{devocionalToDelete?.tema}</strong>? Se eliminarán también todas las entregas asociadas a este tema.</>}
                confirmText="Eliminar"
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
            />

            {/* Confirmation for Submission Deletion (Historial) */}
            <ConfirmationModal
                isOpen={isDeleteEntregaConfirmOpen}
                onClose={() => setIsDeleteEntregaConfirmOpen(false)}
                onConfirm={handleConfirmDeleteEntrega}
                title="Eliminar Registro"
                message="¿Estás seguro de que deseas eliminar este registro de entrega? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
            />
        </div>
    );
}

export default Tareas;