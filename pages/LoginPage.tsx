
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const success = await login(email, password);
    if (!success) {
      setError('Credenciales inválidas. Por favor, intente de nuevo.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-surface p-8 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-text-primary mb-2">
          Iniciar Sesión
        </h2>
        <p className="text-center text-text-secondary mb-8">
          Bienvenido al Sistema de Seguimiento
        </p>

        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-text-secondary block mb-2">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-text-secondary block mb-2"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-background border border-border rounded-md focus:ring-primary focus:border-primary transition"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
          >
            {isLoading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-surface text-text-secondary">O</span>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="w-full flex justify-center items-center bg-white text-gray-700 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h13.01c-.59 3.09-2.26 5.75-4.96 7.55l7.98 6.19c4.63-4.29 7.37-10.45 7.37-17.7z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.98-6.19c-2.18 1.45-4.96 2.3-8.02 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            Ingresar con Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
