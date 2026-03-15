
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

    const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
      let id: NodeJS.Timeout;
      const timeoutPromise = new Promise<T>((resolve) => {
        id = setTimeout(() => {
          console.warn(`Timeout de ${ms}ms alcanzado.`);
          resolve(fallback);
        }, ms);
      });
      return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(id));
    };

    const initAuth = async () => {
      console.log("Iniciando Auth...");
      try {
        console.log("Obteniendo sesión de Supabase...");
        
        const result = await withTimeout(supabase.auth.getSession(), 15000, { data: { session: null }, error: new Error('Timeout getting session') });
        const { data: { session }, error } = result;
        
        if (error) {
          console.error("Error de Supabase Auth:", error);
          if (error.message?.includes('Refresh Token Not Found') || error.message?.includes('Invalid Refresh Token') || error.message?.includes('Timeout')) {
             console.log("Token inválido o timeout, limpiando sesión...");
             await withTimeout(supabase.auth.signOut(), 5000, undefined);
          } else {
             throw error;
          }
        }

        if (session?.user) {
          console.log("Sesión encontrada para el usuario:", session.user.id);
          await withTimeout(loadUserProfile(session.user.id), 15000, false);
        } else {
          console.log("No hay sesión activa.");
        }
      } catch (err: any) {
        console.error("Error inicializando sesión (posible bloqueo de red):", err);
        const errMsg = String(err.message || err);
        if (errMsg.includes('Refresh Token Not Found') || errMsg.includes('Invalid Refresh Token') || errMsg.includes('Timeout')) {
           console.log("Token inválido capturado en catch, limpiando sesión...");
           await withTimeout(supabase.auth.signOut(), 5000, undefined);
        }
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
          await withTimeout(loadUserProfile(session.user.id), 15000, false);
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
