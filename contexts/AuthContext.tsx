
import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await api.getUsuarioById(userId);
      if (profile) {
        setUser(profile);
        const roleData = await api.getRolById(profile.rolId);
        setRol(roleData);
        // No esperamos a que termine updateLastSignIn para no bloquear
        api.updateLastSignIn(userId).catch(err => console.error("Error updating sign in", err));
        return true;
      }
      console.warn("Autenticado en Auth pero sin registro en tabla 'usuarios'.");
      return false;
    } catch (error) {
      console.error("Error cargando perfil:", error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error("Session check error", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Ignorar actualizaciones de token en segundo plano para evitar recargas visuales
      if (event === 'TOKEN_REFRESHED') {
        return; 
      }

      if (session?.user) {
        // Si es un inicio de sesión explícito, podemos mostrar carga si lo deseamos,
        // pero para evitar parpadeos al volver a la pestaña, lo hacemos en background
        // a menos que sea un SIGNED_IN inicial donde el usuario es null.
        if (event === 'SIGNED_IN') {
             // Solo cargamos si el usuario no está ya establecido para evitar parpadeos
             // Como no tenemos acceso seguro al estado 'user' aquí dentro sin dependencias,
             // simplemente ejecutamos la carga sin bloquear la UI con setLoading(true).
             await loadUserProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRol(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Credenciales inválidas. Por favor, revisa tu correo y contraseña.');
        }
        if (error.message.includes('Email not confirmed')) {
          throw new Error('El correo electrónico aún no ha sido confirmado.');
        }
        throw error;
      }

      if (data.user) {
        const success = await loadUserProfile(data.user.id);
        if (!success) {
          throw new Error('Sesión iniciada correctamente, pero no se encontró tu perfil de usuario en el sistema. Contacta al administrador.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setRol(null);
    setLoading(false);
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
