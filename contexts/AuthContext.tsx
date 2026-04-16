import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Usuario, Rol, Permisos } from '../types';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
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
  
  const processingId = useRef<string | null>(null);
  const loadingPromise = useRef<Promise<boolean> | null>(null);

  const loadUserProfile = async (userId: string, email?: string | null) => {
    if (processingId.current === userId && user) return true;
    
    // Si ya hay una carga en progreso para este usuario, esperamos a que termine
    if (processingId.current === userId && loadingPromise.current) {
        return loadingPromise.current;
    }

    processingId.current = userId;
    
    const doLoad = async () => {
        try {
          let profile = await api.getUsuarioById(userId);
          
          // Si no encontramos el perfil por ID, intentamos buscarlo por email (para usuarios migrados)
          if (!profile && email) {
              const profileByEmail = await api.getUsuarioByEmail(email);
              
              if (profileByEmail) {
                  // Migramos el ID del usuario al nuevo UID de Firebase Auth
                  const { id, ...userData } = profileByEmail;
                  await api.migrateUsuarioId(id, userId, userData);
                  profile = { id: userId, ...userData } as Usuario;
              }
          }

          if (profile) {
            setUser(profile);
            const roleData = await api.getRolById(profile.rolId.toString());
            setRol(roleData);
            api.updateLastSignIn(userId).catch(() => {});
            return true;
          }
          
          return false;
        } catch (error) {
          console.error("[Auth] Error cargando perfil:", error);
          return false;
        }
    };

    loadingPromise.current = doLoad();
    const result = await loadingPromise.current;
    if (processingId.current === userId) {
        loadingPromise.current = null;
    }
    return result;
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        // Solo cargar si no estamos ya procesando este usuario
        if (processingId.current !== firebaseUser.uid) {
          setLoading(true);
          const success = await loadUserProfile(firebaseUser.uid, firebaseUser.email);
          // Si falla la carga del perfil, forzamos el cierre de sesión para evitar bucles
          if (!success) {
            console.error("No se pudo cargar el perfil, cerrando sesión.");
            await signOut(auth);
            setUser(null);
            setRol(null);
          }
          setLoading(false);
        }
      } else {
        setUser(null);
        setRol(null);
        processingId.current = null;
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      
      if (userCredential.user) {
        const success = await loadUserProfile(userCredential.user.uid, userCredential.user.email);
        if (!success) {
          await signOut(auth);
          throw new Error('Tu usuario no tiene un perfil configurado en la base de datos.');
        }
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password')) {
        msg = 'Correo o contraseña incorrectos.';
      } else if (msg.includes('network')) {
        msg = 'Error de conexión con el servidor.';
      }
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
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
