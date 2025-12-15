import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Usuario, Rol } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: Usuario | null;
  rol: Rol | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: keyof Rol['permisos'], action: keyof Rol['permisos'][keyof Rol['permisos']]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar perfil del usuario desde la tabla 'usuarios' y su rol
  const fetchUserProfile = async (userId: string) => {
    try {
      const userProfile = await api.getUsuarioById(userId);
      
      if (userProfile) {
        setUser(userProfile);
        
        if (userProfile.rolId) {
          const userRole = await api.getRolById(userProfile.rolId);
          setRol(userRole);
        }
      } else {
        // Fallback: Si el usuario existe en Auth pero no en la tabla pública 'usuarios', limpiar sesión
        console.warn("Usuario autenticado pero no encontrado en tabla pública 'usuarios'.");
        await supabase.auth.signOut();
        setUser(null);
        setRol(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Verificar sesión actual al iniciar
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escuchar cambios en la autenticación (Login, Logout, Auto-refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        await fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRol(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const hasPermission = (module: keyof Rol['permisos'], action: keyof Rol['permisos'][keyof Rol['permisos']]): boolean => {
    if (!rol) return false;
    // Si el rol es ID 1 (Admin) o tiene permisos explícitos
    if (rol.id === 1) return true; 
    return rol.permisos[module]?.[action] ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, rol, loading, login, logout, hasPermission }}>
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