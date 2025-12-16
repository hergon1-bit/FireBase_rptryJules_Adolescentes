import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { KeyIcon, UsersIcon, EyeIcon, EyeOffIcon } from '../components/ui/Icons';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // El cambio de estado en AuthContext redirigirá automáticamente en App.tsx
    } catch (err: any) {
      console.error(err);
      setError('Credenciales incorrectas o error al iniciar sesión.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-surface p-8 rounded-lg shadow-2xl max-w-md w-full border border-border">
        <div className="text-center mb-8">
            <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-text-primary">Iniciar Sesión</h2>
            <p className="text-text-secondary mt-2">Sistema de Seguimiento de Adolescentes</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

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
                    title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
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
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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
        
        <div className="mt-6 text-center">
            <p className="text-xs text-text-secondary">
                ¿Olvidaste tu contraseña? Contacta al administrador del sistema.
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;