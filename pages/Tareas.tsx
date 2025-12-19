import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Devocional, EntregaDevocional, Adolescente } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { formatDate } from '../utils/helpers';
import { BookOpenIcon, CheckCircleIcon, TrashIcon } from '../components/ui/Icons';

type Tab = 'gestion' | 'registro' | 'historial';

const Tareas: React.FC = () => {
    const { devocionales, entregasDevocionales, adolescentes, addDevocional, updateDevocional, deleteDevocional, registrarEntregaBulk, deleteEntrega } = useData();
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

    const initialFormState: Omit<Devocional, 'id'> = {
        numeroSemana: 0,
        tema: '',
        fechaDistribucion: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
    };

    const { values, handleInputChange, setValues, resetForm } = useForm(initialFormState);

    // --- Handlers for Gestion ---
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

    // --- Handlers for Registro ---
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
    
    // --- Handlers for Historial ---
    const handleDeleteEntrega = async (id: number) => {
        if(window.confirm("¿Eliminar este registro de entrega?")) {
            await deleteEntrega(id);
        }
    }


    const sortedDevocionales = useMemo(() => 
        [...devocionales].sort((a,b) => b.numeroSemana - a.numeroSemana), 
    [devocionales]);
    
    const sortedEntregas = useMemo(() => {
        return [...entregasDevocionales].sort((a, b) => new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime());
    }, [entregasDevocionales]);

    // Calcular devocionales pendientes (opcional para UX avanzada, por ahora listamos todos)
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpenIcon className="w-8 h-8 text-primary" />
                Gestión de Tareas y Devocionales
            </h1>

            <div className="flex border-b border-border overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('registro')} 
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'registro' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Registrar Entregas
                </button>
                <button 
                    onClick={() => setActiveTab('gestion')} 
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'gestion' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Definir Devocionales
                </button>
                <button 
                    onClick={() => setActiveTab('historial')} 
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'historial' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Historial de Entregas
                </button>
            </div>

            {/* TAB: REGISTRO DE ENTREGAS */}
            {activeTab === 'registro' && (
                <div className="bg-surface p-6 rounded-lg shadow-lg">
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
                                    className="w-full bg-primary text-white py-2 rounded-md hover:bg-indigo-700 transition font-bold"
                                >
                                    Guardar Entrega
                                </button>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-text-primary">2. Seleccionar Hojas Entregadas</h2>
                            <div className="bg-background rounded-md border border-border overflow-hidden h-96 overflow-y-auto">
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
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                            + Nuevo Devocional
                        </button>
                    </div>
                    <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
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
                                    <tr key={dev.id} className="hover:bg-background/50">
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
                <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
                     <table className="min-w-full divide-y divide-border">
                            <thead className="bg-background">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha Devolución</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Adolescente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Devocional</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Observación</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedEntregas.map(ent => {
                                    const ado = adolescentes.find(a => a.id === ent.adolescenteId);
                                    const dev = devocionales.find(d => d.id === ent.devocionalId);
                                    return (
                                        <tr key={ent.id} className="hover:bg-background/50">
                                            <td className="px-6 py-4 whitespace-nowrap">{formatDate(ent.fechaEntrega)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">{ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{dev ? `Sem ${dev.numeroSemana}: ${dev.tema}` : 'Borrado'}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary">{ent.observaciones || '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleDeleteEntrega(ent.id)} className="text-red-500 hover:text-red-300" title="Eliminar registro">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {sortedEntregas.length === 0 && (
                                    <tr><td colSpan={5} className="p-4 text-center text-text-secondary">No hay entregas registradas aún.</td></tr>
                                )}
                            </tbody>
                        </table>
                </div>
            )}

            {/* Modal para Crear/Editar Devocional */}
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
                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsDevocionalModalOpen(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg">Guardar</button>
                    </div>
                </form>
            </Modal>
            
             <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Devocional"
                message={<>¿Estás seguro de que deseas eliminar el devocional <strong>{devocionalToDelete?.tema}</strong>? Se eliminarán también todas las entregas asociadas a este tema.</>}
                confirmText="Eliminar"
                confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
            />
        </div>
    );
}

export default Tareas;