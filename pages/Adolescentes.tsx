
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Adolescente, Sexo, EstadoAdolescente } from '../types';
import { calcularEdad, formatDate } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { DownloadCloudIcon, RefreshIcon } from '../components/ui/Icons';

const Adolescentes: React.FC = () => {
    const { adolescentes, addAdolescente, updateAdolescente, deleteAdolescente } = useData();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingAdolescente, setEditingAdolescente] = useState<Adolescente | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<'Todos' | EstadoAdolescente>('Todos');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [adolescenteToDelete, setAdolescenteToDelete] = useState<Adolescente | null>(null);
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

    const initialFormState: Omit<Adolescente, 'id'> = {
        nombre: '', apellido: '', cedula: '', registro: '', fechaNacimiento: '', barrio: '', 
        ciudad: '', telefono: '', sexo: 'Masculino', estado: 'Activo'
    };

    const { values, handleInputChange, setValues, resetForm } = useForm<Omit<Adolescente, 'id'>>(initialFormState);

    const openModalForCreate = () => {
        setEditingAdolescente(null);
        resetForm();
        setIsModalOpen(true);
    };

    const openModalForEdit = (adolescente: Adolescente) => {
        setEditingAdolescente(adolescente);
        const { id, ...rest } = adolescente;
        setValues({
            ...rest,
            registro: rest.registro || '',
            barrio: rest.barrio || '',
            ciudad: rest.ciudad || '',
            telefono: rest.telefono || ''
        });
        setIsModalOpen(true);
    };
    
    const forceCloseModal = () => {
        setIsModalOpen(false);
        setEditingAdolescente(null);
        resetForm();
        setIsSaving(false);
    };

    const checkIfChanged = () => {
        if (!editingAdolescente) return true;
        const norm = (v: any) => v === null || v === undefined ? '' : String(v).trim();
        return (
            norm(values.nombre) !== norm(editingAdolescente.nombre) ||
            norm(values.apellido) !== norm(editingAdolescente.apellido) ||
            norm(values.cedula) !== norm(editingAdolescente.cedula) ||
            norm(values.registro) !== norm(editingAdolescente.registro) ||
            norm(values.fechaNacimiento) !== norm(editingAdolescente.fechaNacimiento) ||
            norm(values.barrio) !== norm(editingAdolescente.barrio) ||
            norm(values.ciudad) !== norm(editingAdolescente.ciudad) ||
            norm(values.telefono) !== norm(editingAdolescente.telefono) ||
            norm(values.sexo) !== norm(editingAdolescente.sexo) ||
            norm(values.estado) !== norm(editingAdolescente.estado)
        );
    };

    const closeModal = () => {
        if (isSaving) return;
        if (editingAdolescente && checkIfChanged()) {
            setIsUnsavedConfirmOpen(true);
        } else {
            forceCloseModal();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        if (editingAdolescente && !checkIfChanged()) {
            forceCloseModal();
            return;
        }

        setIsSaving(true);

        try {
            const cleanValues = {
                nombre: (values.nombre || '').trim(),
                apellido: (values.apellido || '').trim(),
                cedula: (values.cedula || '').trim(),
                registro: (values.registro || '').trim(),
                fechaNacimiento: values.fechaNacimiento,
                barrio: (values.barrio || '').trim(),
                ciudad: (values.ciudad || '').trim(),
                telefono: (values.telefono || '').trim(),
                sexo: values.sexo || 'Masculino',
                estado: values.estado || 'Activo',
            };

            if (!cleanValues.nombre || !cleanValues.apellido || !cleanValues.cedula) {
                throw new Error("Nombre, Apellido y Cédula son obligatorios.");
            }

            const isCedulaDuplicate = adolescentes.some(a => {
                if (editingAdolescente) {
                    return a.cedula === cleanValues.cedula && a.id !== editingAdolescente.id;
                }
                return a.cedula === cleanValues.cedula;
            });

            if (isCedulaDuplicate) {
                throw new Error('La cédula ingresada ya pertenece a otro registro.');
            }

            // Implementamos un timeout para evitar que se quede pegado si la red falla
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("La operación tardó demasiado. Verifique su conexión e intente nuevamente.")), 15000)
            );

            const operationPromise = editingAdolescente
                ? updateAdolescente({ ...cleanValues, id: editingAdolescente.id })
                : addAdolescente(cleanValues);

            // Esperamos a que la operación termine o el timeout ocurra
            await Promise.race([operationPromise, timeoutPromise]);
            
            forceCloseModal();
        } catch (error: any) {
            console.error("Error al guardar:", error);
            alert(error.message || "Error al procesar la solicitud.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (adolescente: Adolescente) => {
        setAdolescenteToDelete(adolescente);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (adolescenteToDelete) {
            await deleteAdolescente(adolescenteToDelete.id);
            setIsConfirmModalOpen(false);
            setAdolescenteToDelete(null);
        }
    };

    const filteredAdolescentes = useMemo(() => {
        return adolescentes
            .filter(a =>
                `${a.nombre} ${a.apellido} ${a.registro}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.cedula.includes(searchTerm)
            )
            .filter(a => 
                estadoFilter === 'Todos' ? true : a.estado === estadoFilter
            )
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [adolescentes, searchTerm, estadoFilter]);

    const handleExportCSV = () => {
        if (filteredAdolescentes.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }
        const headers = ["ID", "Nombre", "Apellido", "Cedula", "Reg. Salud", "Edad", "Estado"];
        const csvRows = [
            headers.join(';'),
            ...filteredAdolescentes.map(ado => [
                ado.id, ado.nombre, ado.apellido, ado.cedula, ado.registro || 'N/A',
                calcularEdad(ado.fechaNacimiento), ado.estado
            ].join(';'))
        ];
        const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'adolescentes.csv';
        link.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Gestión de Adolescentes</h1>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportCSV} className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition flex items-center gap-2 shadow-md">
                        <DownloadCloudIcon className="w-5 h-5" />
                        <span>Exportar</span>
                    </button>
                    {hasPermission('adolescentes', 'create') && (
                        <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md">
                            Agregar Adolescente
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="Buscar por nombre, cédula o registro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary focus:border-primary transition outline-none"
                />
                <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value as 'Todos' | EstadoAdolescente)}
                    className="w-full sm:w-auto bg-surface border border-border rounded-md px-4 py-2 focus:ring-primary focus:border-primary transition outline-none"
                >
                    <option value="Todos">Todos los Estados</option>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Anulado">Anulado</option>
                </select>
            </div>
            
            <div className="bg-surface shadow-xl rounded-lg overflow-hidden border border-border">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Nombre Completo</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Cédula / Reg.</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Edad</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Estado</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-text-secondary uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAdolescentes.map((ado) => (
                                <tr key={ado.id} className="hover:bg-primary/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-text-primary">{ado.nombre} {ado.apellido}</div>
                                        <div className="text-[10px] text-text-secondary uppercase">{ado.ciudad || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-text-secondary">{ado.cedula}</div>
                                        <div className="text-[10px] text-primary font-bold">REG: {ado.registro || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-bold">{calcularEdad(ado.fechaNacimiento)} años</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-md uppercase tracking-wider ${
                                            ado.estado === 'Activo' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            ado.estado === 'Inactivo' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                            'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}>
                                            {ado.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                        {hasPermission('adolescentes', 'update') && <button onClick={() => openModalForEdit(ado)} className="text-primary hover:text-indigo-400 font-bold">Editar</button>}
                                        {hasPermission('adolescentes', 'delete') && <button onClick={() => handleDeleteClick(ado)} className="text-red-500 hover:text-red-400 font-bold">Eliminar</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredAdolescentes.length === 0 && (
                    <div className="py-12 text-center text-text-secondary italic">No se encontraron registros activos.</div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAdolescente ? "Editar Adolescente" : "Agregar Adolescente"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nombre" name="nombre" value={values.nombre || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Apellido" name="apellido" value={values.apellido || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Cédula" name="cedula" value={values.cedula || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Registro de Salud" name="registro" value={values.registro || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Fecha de Nacimiento" name="fechaNacimiento" type="date" value={values.fechaNacimiento || ''} onChange={handleInputChange} required disabled={isSaving} />
                        <InputField label="Barrio" name="barrio" value={values.barrio || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Ciudad" name="ciudad" value={values.ciudad || ''} onChange={handleInputChange} disabled={isSaving} />
                        <InputField label="Teléfono" name="telefono" value={values.telefono || ''} onChange={handleInputChange} disabled={isSaving} />
                        <SelectField label="Sexo" name="sexo" value={values.sexo || 'Masculino'} onChange={handleInputChange} disabled={isSaving}>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                        </SelectField>
                        <SelectField label="Estado" name="estado" value={values.estado || 'Activo'} onChange={handleInputChange} disabled={isSaving}>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                            <option value="Anulado">Anulado</option>
                        </SelectField>
                    </div>
                    <div className="flex justify-end space-x-3 pt-6 border-t border-border mt-4">
                        <button type="button" onClick={closeModal} disabled={isSaving} className="bg-gray-600 text-white px-5 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="bg-primary text-white px-8 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg">
                            {isSaving ? (
                                <>
                                    <RefreshIcon className="w-5 h-5 animate-spin" />
                                    Guardando...
                                </>
                            ) : 'Grabar Datos'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={<>¿Estás seguro de que quieres eliminar a <strong>{adolescenteToDelete?.nombre} {adolescenteToDelete?.apellido}</strong>? Esta acción no se puede deshacer.</>}
                confirmText="Eliminar"
            />
            
            <ConfirmationModal
                isOpen={isUnsavedConfirmOpen}
                onClose={() => setIsUnsavedConfirmOpen(false)}
                onConfirm={() => {
                    setIsUnsavedConfirmOpen(false);
                    forceCloseModal();
                }}
                title="Descartar Cambios"
                message="Tienes cambios sin guardar en el formulario. ¿Estás seguro de que quieres salir y perder los cambios?"
                confirmText="Descartar"
                confirmButtonClassName="bg-yellow-600 text-white hover:bg-yellow-700"
            />
        </div>
    );
};

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input {...props} id={props.name} className="block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary disabled:opacity-50 transition-all sm:text-sm" />
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <select {...props} id={props.name} className="block w-full pl-3 pr-10 py-2 bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent rounded-md text-text-primary disabled:opacity-50 transition-all sm:text-sm">
            {children}
        </select>
    </div>
);

export default Adolescentes;
