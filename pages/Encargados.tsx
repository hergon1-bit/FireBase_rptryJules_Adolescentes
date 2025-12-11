
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Encargado } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';
import { formatDate } from '../utils/helpers';

const Encargados: React.FC = () => {
    const { encargados, addEncargado, updateEncargado, deleteEncargado } = useData();
    const { hasPermission } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEncargado, setEditingEncargado] = useState<Encargado | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [encargadoToDelete, setEncargadoToDelete] = useState<Encargado | null>(null);
    const [isUnsavedConfirmOpen, setIsUnsavedConfirmOpen] = useState(false);

    const initialFormState: Omit<Encargado, 'id'> = {
        nombre: '', apellido: '', cedula: '', fechaNacimiento: '', 
        barrio: '', ciudad: '', telefono: '', email: ''
    };

    const { values, handleInputChange, setValues, resetForm } = useForm<Omit<Encargado, 'id'>>(initialFormState);

    const openModalForCreate = () => {
        setEditingEncargado(null);
        resetForm();
        setIsModalOpen(true);
    };

    const openModalForEdit = (encargado: Encargado) => {
        setEditingEncargado(encargado);
        setValues({ ...encargado });
        setIsModalOpen(true);
    };
    
    const forceCloseModal = () => {
        setIsModalOpen(false);
        setEditingEncargado(null);
        resetForm();
    };

    const closeModal = () => {
        if (editingEncargado) {
            const hasChanged = Object.keys(initialFormState).some(key => {
                const formKey = key as keyof typeof values;
                const originalKey = key as keyof Encargado;
                return String(values[formKey] ?? '') !== String(editingEncargado[originalKey] ?? '');
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

        const isCedulaDuplicate = encargados.some(enc => {
            if (editingEncargado) {
                // In edit mode, check against other encargados
                return enc.cedula === values.cedula && enc.id !== editingEncargado.id;
            }
            // In create mode, check against all encargados
            return enc.cedula === values.cedula;
        });

        if (isCedulaDuplicate) {
            alert('Error: La cédula ingresada ya existe en la base de datos.');
            return; // Stop form submission
        }

        if (editingEncargado) {
            await updateEncargado({ ...values, id: editingEncargado.id });
        } else {
            await addEncargado(values);
        }
        forceCloseModal();
    };

    const handleDeleteClick = (encargado: Encargado) => {
        setEncargadoToDelete(encargado);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (encargadoToDelete) {
            await deleteEncargado(encargadoToDelete.id);
            setIsConfirmModalOpen(false);
            setEncargadoToDelete(null);
        }
    };

    const filteredEncargados = useMemo(() => {
        return encargados.filter(e =>
            `${e.nombre} ${e.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.cedula.includes(searchTerm) ||
            (e.email && e.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [encargados, searchTerm]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Encargados</h1>
                {hasPermission('encargados', 'create') && (
                    <button onClick={openModalForCreate} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                        Agregar Encargado
                    </button>
                )}
            </div>
            
            <input
                type="text"
                placeholder="Buscar por nombre, cédula o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary focus:border-primary transition"
            />
            
            <div className="bg-surface shadow-lg rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-background">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Nombre Completo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cédula</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha de Nacimiento</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Teléfono</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredEncargados.map((enc) => (
                            <tr key={enc.id} className="hover:bg-background/50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-text-primary">{enc.nombre} {enc.apellido}</div>
                                    <div className="text-sm text-text-secondary">{enc.ciudad}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.cedula}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.fechaNacimiento ? formatDate(enc.fechaNacimiento) : 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.email || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{enc.telefono}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {hasPermission('encargados', 'update') && <button onClick={() => openModalForEdit(enc)} className="text-primary hover:text-indigo-400">Editar</button>}
                                    {hasPermission('encargados', 'delete') && <button onClick={() => handleDeleteClick(enc)} className="text-red-500 hover:text-red-400">Eliminar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingEncargado ? "Editar Encargado" : "Agregar Encargado"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nombre" name="nombre" value={values.nombre} onChange={handleInputChange} required />
                        <InputField label="Apellido" name="apellido" value={values.apellido} onChange={handleInputChange} required />
                        <InputField label="Cédula" name="cedula" value={values.cedula} onChange={handleInputChange} required />
                        <InputField label="Email" name="email" type="email" value={values.email || ''} onChange={handleInputChange} />
                        <InputField label="Teléfono" name="telefono" value={values.telefono} onChange={handleInputChange} required />
                        <InputField label="Fecha de Nacimiento" name="fechaNacimiento" type="date" value={values.fechaNacimiento || ''} onChange={handleInputChange} />
                        <InputField label="Barrio" name="barrio" value={values.barrio} onChange={handleInputChange} required />
                        <InputField label="Ciudad" name="ciudad" value={values.ciudad} onChange={handleInputChange} required />
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
                        ¿Estás seguro de que quieres eliminar a <strong>{encargadoToDelete?.nombre} {encargadoToDelete?.apellido}</strong>? Esta acción no se puede deshacer.
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

// Helper component for form fields
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label htmlFor={props.name} className="block text-sm font-medium text-text-secondary">{label}</label>
        <input {...props} id={props.name} className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
    </div>
);

export default Encargados;
