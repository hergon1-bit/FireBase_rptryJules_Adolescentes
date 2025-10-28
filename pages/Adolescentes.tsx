import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Adolescente, Sexo, EstadoAdolescente } from '../types';
import { calcularEdad, formatDate } from '../utils/helpers';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';

const Adolescentes: React.FC = () => {
    const { adolescentes, addAdolescente, updateAdolescente, deleteAdolescente } = useData();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdolescente, setEditingAdolescente] = useState<Adolescente | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<'Todos' | EstadoAdolescente>('Todos');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [adolescenteToDelete, setAdolescenteToDelete] = useState<Adolescente | null>(null);
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

    const initialFormState: Omit<Adolescente, 'id'> = {
        nombre: '', apellido: '', cedula: '', fechaNacimiento: '', barrio: '', 
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
        setValues({ ...adolescente });
        setIsModalOpen(true);
    };
    
    const forceCloseModal = () => {
        setIsModalOpen(false);
        setEditingAdolescente(null);
        resetForm();
    };

    const closeModal = () => {
        if (editingAdolescente) {
             const hasChanged = Object.keys(initialFormState).some(key => {
                const formKey = key as keyof typeof values;
                const originalKey = key as keyof Adolescente;
                return String(values[formKey] ?? '') !== String(editingAdolescente[originalKey] ?? '');
            });

            if (hasChanged) {
                setIsUnsavedConfirmOpen(true);
            } else {
                forceCloseModal();
            }
        } else {
            forceCloseModal();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isCedulaDuplicate = adolescentes.some(a => {
            if (editingAdolescente) {
                // In edit mode, check against other adolescents
                return a.cedula === values.cedula && a.id !== editingAdolescente.id;
            }
            // In create mode, check against all adolescents
            return a.cedula === values.cedula;
        });

        if (isCedulaDuplicate) {
            alert('Error: La cédula ingresada ya existe en la base de datos.');
            return; // Stop form submission
        }

        if (editingAdolescente) {
            await updateAdolescente({ ...values, id: editingAdolescente.id });
        } else {
            await addAdolescente(values);
        }
        forceCloseModal();
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
                `${a.nombre} ${a.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.cedula.includes(searchTerm)
            )
            .filter(a => 
                estadoFilter === 'Todos' ? true : a.estado === estadoFilter
            );
    }, [adolescentes, searchTerm, estadoFilter]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Adolescentes</h1>
                {hasPermission('adolescentes', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                        Agregar Adolescente
                    </button>
                )}
            </div>
            
            <div className="flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="Buscar por nombre o cédula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-auto flex-grow max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary focus:border-primary transition"
                    aria-label="Buscar por nombre o cédula"
                />
                <div className="relative">
                    <select
                        value={estadoFilter}
                        onChange={(e) => setEstadoFilter(e.target.value as 'Todos' | EstadoAdolescente)}
                        className="appearance-none w-full sm:w-auto bg-surface border border-border rounded-md px-4 py-2 pr-8 focus:ring-primary focus:border-primary transition"
                        aria-label="Filtrar por estado"
                    >
                        <option value="Todos">Todos los Estados</option>
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                        <option value="Anulado">Anulado</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-secondary">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>
                <div className="ml-auto text-sm text-text-secondary">
                    Mostrando <span className="font-bold text-text-primary">{filteredAdolescentes.length}</span> de <span className="font-bold text-text-primary">{adolescentes.length}</span> registros
                </div>
            </div>
            
            <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Nombre Completo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cédula</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Edad</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Teléfono</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Estado</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredAdolescentes.map((ado) => (
                            <tr key={ado.id} className="hover:bg-background/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-text-primary">{ado.nombre} {ado.apellido}</div>
                                    <div className="text-sm text-text-secondary">{ado.ciudad}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{ado.cedula}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{calcularEdad(ado.fechaNacimiento)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{ado.telefono}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        ado.estado === 'Activo' ? 'bg-green-100 text-green-800' :
                                        ado.estado === 'Inactivo' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {ado.estado}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {hasPermission('adolescentes', 'update') && <button onClick={() => openModalForEdit(ado)} className="text-primary hover:text-indigo-400">Editar</button>}
                                    {hasPermission('adolescentes', 'delete') && <button onClick={() => handleDeleteClick(ado)} className="text-red-500 hover:text-red-400">Eliminar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingAdolescente ? "Editar Adolescente" : "Agregar Adolescente"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nombre" name="nombre" value={values.nombre} onChange={handleInputChange} required />
                        <InputField label="Apellido" name="apellido" value={values.apellido} onChange={handleInputChange} required />
                        <InputField label="Cédula" name="cedula" value={values.cedula} onChange={handleInputChange} required />
                        <InputField label="Fecha de Nacimiento" name="fechaNacimiento" type="date" value={values.fechaNacimiento} onChange={handleInputChange} required />
                        <InputField label="Barrio" name="barrio" value={values.barrio} onChange={handleInputChange} />
                        <InputField label="Ciudad" name="ciudad" value={values.ciudad} onChange={handleInputChange} />
                        <InputField label="Teléfono" name="telefono" value={values.telefono} onChange={handleInputChange} />
                        <SelectField label="Sexo" name="sexo" value={values.sexo} onChange={handleInputChange}>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                        </SelectField>
                        <SelectField label="Estado" name="estado" value={values.estado} onChange={handleInputChange}>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                            <option value="Anulado">Anulado</option>
                        </SelectField>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={closeModal} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Guardar</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirmar Eliminación"
                message={
                    <>
                        ¿Estás seguro de que quieres eliminar a <strong>{adolescenteToDelete?.nombre} {adolescenteToDelete?.apellido}</strong>? Esta acción no se puede deshacer.
                    </>
                }
                confirmText="Confirmar Eliminación"
            />
            
            <ConfirmationModal
                isOpen={isUnsavedConfirmOpen}
                onClose={() => setIsUnsavedConfirmOpen(false)}
                onConfirm={() => {
                    setIsUnsavedConfirmOpen(false);
                    forceCloseModal();
                }}
                title="Descartar Cambios"
                message="Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar y descartar los cambios?"
                confirmText="Descartar"
                confirmButtonClassName="bg-yellow-500 text-background hover:bg-yellow-600"
            />
        </div>
    );
};

// Helper components for form fields
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <input {...props} id={props.name} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <select {...props} id={props.name} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-background border-border focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
            {children}
        </select>
    </div>
);


export default Adolescentes;