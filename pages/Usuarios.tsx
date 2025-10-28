
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Usuario } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useForm } from '../hooks/useForm';

// Helper Components
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

const RoleBadge: React.FC<{ roleName?: string }> = ({ roleName }) => {
    if (!roleName) return <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-500/30 text-gray-300">Sin Rol</span>;

    const colorClasses: { [key: string]: string } = {
        'Administrador': 'bg-red-500/30 text-red-300',
        'Encargado': 'bg-blue-500/30 text-blue-300',
        'Staff': 'bg-green-500/30 text-green-300',
    };
    
    const defaultColor = 'bg-gray-500/30 text-gray-300';
    
    const className = colorClasses[roleName] || defaultColor;

    return (
        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${className}`}>
            {roleName}
        </span>
    );
};

// Main Component
const Usuarios: React.FC = () => {
    const { usuarios, roles, addUser, updateUser, deleteUser } = useData();
    const { hasPermission } = useAuth();
    
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [isUserConfirmOpen, setIsUserConfirmOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<Usuario | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const initialFormState = {
        nombre: '',
        email: '',
        password: '',
        rolId: roles[0]?.id || 1,
    };
    
    const { values, handleInputChange, setValues, resetForm } = useForm(initialFormState);
    
    const filteredUsuarios = useMemo(() => {
        return usuarios.filter(user =>
            user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [usuarios, searchTerm]);

    // --- User Handlers ---
    const openModalForCreateUser = () => {
        setEditingUser(null);
        resetForm();
        setIsUserModalOpen(true);
    };

    const openModalForEditUser = (user: Usuario) => {
        setEditingUser(user);
        setValues({ ...user, password: '' });
        setIsUserModalOpen(true);
    };
    
    const handleSubmitUser = async (e: React.FormEvent) => {
        e.preventDefault();

        const isEmailDuplicate = usuarios.some(u => {
            if (editingUser) {
                return u.email === values.email && u.id !== editingUser.id;
            }
            return u.email === values.email;
        });

        if (isEmailDuplicate) {
            alert('Error: El correo electrónico ingresado ya existe.');
            return;
        }

        const userData = { ...values, rolId: Number(values.rolId) };
        if (editingUser) {
            await updateUser({ ...userData, id: editingUser.id });
        } else {
            if (!userData.password) { alert('La contraseña es obligatoria para nuevos usuarios.'); return; }
            await addUser(userData);
        }
        setIsUserModalOpen(false);
    };

    const handleDeleteUserClick = (user: Usuario) => {
        setUserToDelete(user);
        setIsUserConfirmOpen(true);
    };

    const handleConfirmUserDelete = async () => {
        if (userToDelete) {
            await deleteUser(userToDelete.id);
            setIsUserConfirmOpen(false);
            setUserToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
                {hasPermission('usuarios', 'create') && (
                    <button onClick={openModalForCreateUser} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                        Agregar Usuario
                    </button>
                )}
            </div>
            
            <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm px-4 py-2 bg-surface border border-border rounded-md focus:ring-primary focus:border-primary transition mb-4"
            />
            
            <div className="bg-surface p-6 rounded-lg shadow-lg overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-border">
                        <tr>
                            <th className="py-2 px-4 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Nombre</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Email</th>
                            <th className="py-2 px-4 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Rol</th>
                            <th className="py-2 px-4 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredUsuarios.map(user => (
                            <tr key={user.id} className="hover:bg-background/50">
                                <td className="py-3 px-4 whitespace-nowrap">{user.nombre}</td>
                                <td className="py-3 px-4 whitespace-nowrap">{user.email}</td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <RoleBadge roleName={roles.find(r => r.id === user.rolId)?.nombre} />
                                </td>
                                <td className="py-3 px-4 whitespace-nowrap text-right space-x-2 text-sm">
                                    {hasPermission('usuarios', 'update') && <button onClick={() => openModalForEditUser(user)} className="text-primary hover:text-indigo-400">Editar</button>}
                                    {hasPermission('usuarios', 'delete') && <button onClick={() => handleDeleteUserClick(user)} className="text-red-500 hover:text-red-400">Eliminar</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={editingUser ? 'Editar Usuario' : 'Agregar Usuario'}>
                 <form onSubmit={handleSubmitUser} className="space-y-4">
                    <InputField label="Nombre Completo" name="nombre" value={values.nombre} onChange={handleInputChange} required />
                    <InputField label="Correo Electrónico" name="email" type="email" value={values.email} onChange={handleInputChange} required />
                    <InputField label="Contraseña" name="password" type="password" value={values.password} onChange={handleInputChange} placeholder={editingUser ? 'Dejar en blanco para no cambiar' : ''} required={!editingUser} />
                    <SelectField label="Rol" name="rolId" value={values.rolId} onChange={handleInputChange}>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </SelectField>
                    <div className="flex justify-end space-x-2 pt-4">
                        <button type="button" onClick={() => setIsUserModalOpen(false)} className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">Cancelar</button>
                        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Guardar</button>
                    </div>
                </form>
            </Modal>
            
            <ConfirmationModal
                isOpen={isUserConfirmOpen}
                onClose={() => setIsUserConfirmOpen(false)}
                onConfirm={handleConfirmUserDelete}
                title="Confirmar Eliminación de Usuario"
                message={<>¿Estás seguro de que quieres eliminar al usuario <strong>{userToDelete?.nombre}</strong>? Esta acción no se puede deshacer.</>}
            />
        </div>
    );
};

export default Usuarios;