
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Usuario, Rol } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: Usuario | null;
  rol: Rol | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (module: keyof Rol['permisos'], action: keyof Rol['permisos'][keyof Rol['permisos']]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  
  const initAuth = useCallback(async () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        const parsedUser: Usuario = JSON.parse(storedUser);
        setUser(parsedUser);
        const userRol = await api.getRolById(parsedUser.rolId);
        setRol(userRol || null);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const loggedInUser = await api.login(email, pass);
    if (loggedInUser) {
      setUser(loggedInUser);
      const userRol = await api.getRolById(loggedInUser.rolId);
      setRol(userRol || null);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setRol(null);
    localStorage.removeItem('user');
  };
  
  const hasPermission = (module: keyof Rol['permisos'], action: keyof Rol['permisos'][keyof Rol['permisos']]): boolean => {
    if (!rol) return false;
    return rol.permisos[module]?.[action] ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, rol, login, logout, hasPermission }}>
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
