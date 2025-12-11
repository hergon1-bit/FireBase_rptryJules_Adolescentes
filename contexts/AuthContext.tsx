import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Usuario, Rol } from '../types';

interface AuthContextType {
  user: Usuario | null;
  rol: Rol | null;
  hasPermission: (module: keyof Rol['permisos'], action: keyof Rol['permisos'][keyof Rol['permisos']]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Configured with the specific requested user ID acting as Admin
  const defaultUser: Usuario = {
      id: 'd52c4619-ad85-4941-9428-668cd6f9dee2',
      email: 'hergon1@gmail.com',
      nombre: 'Administrador',
      rolId: 1, // Assuming ID 1 is Administrator in your DB
      avatarUrl: 'https://ui-avatars.com/api/?name=Administrador&background=4f46e5&color=fff'
  };
  
  // Mock Permissions for admin (full access) to ensure UI works even if roles table fetch fails initially
  const adminPermisos = {
      read: true, create: true, update: true, delete: true
  };
  
  const defaultRol: Rol = {
      id: 1,
      nombre: 'Administrador',
      permisos: {
          adolescentes: adminPermisos,
          encargados: adminPermisos,
          reuniones: adminPermisos,
          tutores: adminPermisos,
          eventos: adminPermisos,
          usuarios: adminPermisos,
      }
  };

  const [user] = useState<Usuario | null>(defaultUser);
  const [rol] = useState<Rol | null>(defaultRol);
  
  const hasPermission = (module: keyof Rol['permisos'], action: keyof Rol['permisos'][keyof Rol['permisos']]): boolean => {
    if (!rol) return false;
    return rol.permisos[module]?.[action] ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, rol, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};