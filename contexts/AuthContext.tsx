
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Usuario, Rol, Permisos } from '../types';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

interface AuthContextType {
  user: Usuario | null;
  rol: Rol | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: keyof Rol['permisos'], action: keyof Permisos) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Ref para evitar procesar la misma sesión múltiples veces durante el arranque
  const processingId = useRef<string | null>(null);

  const loadUserProfile = async (userId: string) => {
    if (processingId.current === userId && user) return true;
    processingId.current = userId;

    try {
      const profile = await api.getUsuarioById(userId);
      if (profile) {
        setUser(profile);
        const roleData = await api.getRolById(profile.rolId);
        setRol(roleData);
        // Actualizamos última conexión de forma asíncrona
        api.updateLastSignIn(userId).catch(() => {});
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error cargando perfil:", error);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        // 1. Verificar si ya hay una sesión guardada en localStorage
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user && isMounted) {
          await loadUserProfile(session.user.id);
        }
      } catch (err) {
        console.error("Error inicializando sesión:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // 2. Escuchar cambios globales de Auth (Login, Logout, Token expired)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        // Solo cargar si el usuario cambió o no tenemos perfil
        if (processingId.current !== session.user.id) {
          setLoading(true);
          await loadUserProfile(session.user.id);
          setLoading(false);
        }
      } else {
        // No hay sesión activa
        setUser(null);
        setRol(null);
        processingId.current = null;
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Arreglo vacío: Solo se ejecuta UNA VEZ al abrir la app

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        let msg = error.message;
        if (msg.includes('Invalid login credentials')) {
          msg = 'Correo o contraseña incorrectos.';
        } else if (msg.includes('fetch')) {
          msg = 'Error de conexión con el servidor.';
        }
        throw new Error(msg);
      }

      if (data.user) {
        const success = await loadUserProfile(data.user.id);
        if (!success) {
          await supabase.auth.signOut();
          throw new Error('Tu usuario no tiene un perfil configurado en la base de datos.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRol(null);
      processingId.current = null;
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (module: keyof Rol['permisos'], action: keyof Permisos): boolean => {
    if (!rol) return false;
    const modulePerms = (rol.permisos as any)[module];
    return modulePerms ? !!modulePerms[action] : false;
  };

  return (
    <AuthContext.Provider value={{ user, rol, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
