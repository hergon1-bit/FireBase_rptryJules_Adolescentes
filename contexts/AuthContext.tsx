import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
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
  
  // Usamos una referencia para evitar procesar múltiples eventos de inicio de sesión simultáneos
  const isProcessingAuth = useRef(false);

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
        console.warn("Usuario autenticado pero no encontrado en tabla pública 'usuarios'.");
        setUser(null);
        setRol(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
      isProcessingAuth.current = false;
    }
  };

  useEffect(() => {
    // 1. Verificación inicial de sesión
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          isProcessingAuth.current = true;
          // Registramos la conexión en segundo plano sin bloquear
          api.updateLastSignIn(session.user.id).catch(err => console.debug("Sync conexión:", err));
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Escuchar cambios de estado (Login, Logout, Token Refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.debug(`Auth Event: ${event}`);

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Si ya tenemos el usuario y el ID es el mismo, no activamos el loading global
        // Esto evita que aparezca el círculo de carga al cambiar de pestaña
        if (user?.id === session.user.id) {
          // Actualizamos datos en silencio si es necesario
          api.updateLastSignIn(session.user.id).catch(() => {});
          return;
        }

        // Si es un nuevo inicio de sesión real
        if (!isProcessingAuth.current) {
          isProcessingAuth.current = true;
          setLoading(true);
          await api.updateLastSignIn(session.user.id);
          await fetchUserProfile(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRol(null);
        setLoading(false);
        isProcessingAuth.current = false;
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [user?.id]); // Dependencia del ID de usuario para saber si cambió

  const login = async (email: string, password: string) => {
    // El onAuthStateChange se encargará de cargar el perfil tras un login exitoso
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  const hasPermission = (module: keyof Rol['permisos'], action: keyof Rol['permisos'][keyof Rol['permisos']]): boolean => {
    if (!rol) return false;
    // Nivel Administrador tiene acceso total
    if (rol.id === 1 || rol.nombre?.toLowerCase().includes('admin')) return true; 
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