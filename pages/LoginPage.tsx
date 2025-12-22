
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { KeyIcon, UsersIcon, EyeIcon, EyeOffIcon, MailIcon, ArrowLeftIcon, RefreshIcon } from '../components/ui/Icons';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Recovery state
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  // Initial Setup State
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    const checkUsers = async () => {
        const count = await api.countUsuarios();
        setIsFirstRun(count === 0);
    };
    checkUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Credenciales incorrectas o error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setIsLoading(true);

      try {
          // 1. Asegurar roles
          await api.ensureDefaultRoles();
          // 2. Crear admin
          await api.createUsuario({
              nombre: adminName,
              email: email,
              password: password,
              rolId: 1 // Admin
          });
          // 3. Intentar login
          await login(email, password);
      } catch (err: any) {
          setError(err.message || 'Error durante la configuración inicial.');
      } finally {
          setIsLoading(false);
      }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setRecoveryMessage('');
      setIsLoading(true);
      
      try {
          await api.resetPasswordForEmail(recoveryEmail);
          setRecoveryMessage('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      } catch (err: any) {
          console.error(err);
          setError(err.message || 'Error al enviar la solicitud.');
      } finally {
          setIsLoading(false);
      }
  };

  const toggleView = () => {
      setIsRecovering(!isRecovering);
      setError('');
      setRecoveryMessage('');
      setRecoveryEmail('');
  };

  if (isFirstRun === null) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-background">
              <RefreshIcon className="w-10 h-10 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-surface p-8 rounded-lg shadow-2xl max-w-md w-full border border-border">
        
        {/* Header */}
        <div className="text-center mb-8">
            <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-text-primary">
                {isFirstRun ? 'Configuración Inicial' : isRecovering ? 'Recuperar Cuenta' : 'Iniciar Sesión'}
            </h2>
            <p className="text-text-secondary mt-2">
                {isFirstRun ? 'Crea la primera cuenta de administrador' : 'Sistema de Seguimiento de Adolescentes'}
            </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded mb-6 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}
        
        {recoveryMessage && (
             <div className="bg-green-500/10 border border-green-500 text-green-400 px-4 py-3 rounded mb-6 text-sm text-center animate-fade-in">
                {recoveryMessage}
             </div>
        )}

        {/* Initial Setup Form */}
        {isFirstRun && (
            <form onSubmit={handleInitialSetup} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Tu Nombre</label>
                    <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-gray-500 transition-all"
                        placeholder="Administrador"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Correo Electrónico</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-gray-500 transition-all"
                        placeholder="admin@ejemplo.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Contraseña (Mín. 6 caracteres)</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-gray-500 transition-all"
                        placeholder="••••••••"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center bg-primary text-white py-3 px-4 rounded-lg hover:bg-indigo-600 transition-colors font-bold disabled:opacity-50"
                >
                    {isLoading ? <RefreshIcon className="w-5 h-5 animate-spin mr-2" /> : 'Crear Admin e Iniciar'}
                </button>
            </form>
        )}

        {/* Login Form */}
        {!isRecovering && !isFirstRun && (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Correo Electrónico</label>
                <div className="relative">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full pl-4 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-gray-500 transition-all"
                        placeholder="nombre@ejemplo.com"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Contraseña</label>
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-4 pr-12 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-gray-500 transition-all"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary focus:outline-none"
                    >
                        {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center bg-primary text-white py-3 px-4 rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
                {isLoading ? (
                    <>
                        <RefreshIcon className="w-5 h-5 animate-spin mr-2" />
                        Ingresando...
                    </>
                ) : (
                    <>
                        <KeyIcon className="w-5 h-5 mr-2" />
                        Ingresar
                    </>
                )}
            </button>
            </form>
        )}

        {/* Recovery Form */}
        {isRecovering && !isFirstRun && (
             <form onSubmit={handleRecoverySubmit} className="space-y-6">
                <p className="text-sm text-text-secondary text-center mb-4">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                </p>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Correo Electrónico</label>
                    <div className="relative">
                        <input
                            type="email"
                            value={recoveryEmail}
                            onChange={(e) => setRecoveryEmail(e.target.value)}
                            required
                            className="w-full pl-4 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary placeholder-gray-500 transition-all"
                            placeholder="nombre@ejemplo.com"
                        />
                    </div>
                </div>
                 <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center bg-secondary text-white py-3 px-4 rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                    {isLoading ? (
                        <>
                             <RefreshIcon className="w-5 h-5 animate-spin mr-2" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <MailIcon className="w-5 h-5 mr-2" />
                            Enviar Enlace
                        </>
                    )}
                </button>
             </form>
        )}
        
        {!isFirstRun && (
            <div className="mt-6 text-center">
                {!isRecovering ? (
                    <button 
                        onClick={toggleView}
                        className="text-sm text-primary hover:text-indigo-400 font-medium transition-colors focus:outline-none"
                    >
                        ¿Olvidaste tu contraseña?
                    </button>
                ) : (
                    <button 
                        onClick={toggleView}
                        className="text-sm text-text-secondary hover:text-text-primary font-medium transition-colors focus:outline-none flex items-center justify-center mx-auto"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" />
                        Volver al inicio de sesión
                    </button>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
