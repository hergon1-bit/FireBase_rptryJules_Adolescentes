
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
      // Timeout de seguridad: si Supabase tarda más de 4s, liberamos la carga
      const timeoutId = setTimeout(() => {
          if (mounted) setLoading(false);
      }, 4000);

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
          clearTimeout(timeoutId);
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
        if (event === 'SIGNED_IN') {
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
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        console.error("Supabase Login Error:", error);
        let msg = error.message;

        if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
          msg = 'Credenciales inválidas. Verifica tu correo y contraseña.';
        } else if (msg.includes('Email not confirmed')) {
          msg = 'El correo electrónico aún no ha sido confirmado. Revisa tu bandeja de entrada.';
        } else if (msg.includes('Network request failed') || msg.includes('fetch failed')) {
            msg = 'Error de conexión. Por favor verifica tu internet.';
        } else if (msg.includes('Too many requests')) {
            msg = 'Demasiados intentos fallidos. Por favor espera unos minutos.';
        }

        throw new Error(msg);
      }

      if (data.user) {
        const success = await loadUserProfile(data.user.id);
        if (!success) {
          await supabase.auth.signOut(); 
          throw new Error('Tu usuario no tiene un perfil asignado en el sistema. Contacta al administrador.');
        }
      }
    } catch (error) {
        throw error;
    }
  };

  const logout = async () => {
    try {
      // Priorizamos la experiencia de usuario limpiando el estado local inmediatamente
      // Esto hace que App.tsx detecte que !user y muestre LoginPage sin esperar al servidor
      setUser(null);
      setRol(null);
      setLoading(false);
      
      // Intentamos cerrar la sesión en el servidor pero no bloqueamos la UI con await largo
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      // Forzamos estados por si acaso
      setUser(null);
      setRol(null);
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
