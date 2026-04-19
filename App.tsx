
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Page } from './types';

import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Adolescentes from './pages/Adolescentes';
import Encargados from './pages/Encargados';
import Reuniones from './pages/Reuniones';
import Asistencia from './pages/Asistencia';
import Tareas from './pages/Tareas';
import Tutores from './pages/Tutores';
import Eventos from './pages/Eventos';
import Reportes from './pages/Reportes';
import ReportesFinancieros from './pages/ReportesFinancieros';
import Usuarios from './pages/Usuarios';
import Roles from './pages/Roles';
import LimpiarTablas from './pages/LimpiarTablas';
import CargarTablas from './pages/CargarTablas';
import UpdatePassword from './pages/UpdatePassword';
import LoginPage from './pages/LoginPage';
import Servidores from './pages/Servidores';
import VerTablas from './pages/VerTablas';

import MigracionSupabase from './pages/MigracionSupabase';
import InactivarTeens from './pages/InactivarTeens';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [pageParams, setPageParams] = useState<any>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const navigateTo = (page: Page, params?: any) => {
    setCurrentPage(page);
    setPageParams(params);
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard navigateTo={navigateTo} />;
      case 'adolescentes': return <Adolescentes />;
      case 'servidores': return <Servidores />;
      case 'encargados': return <Encargados />;
      case 'reuniones': return <Reuniones navigateTo={navigateTo} />;
      case 'asistencia': return <Asistencia reunionId={pageParams?.reunionId} navigateTo={navigateTo} />;
      case 'tareas': return <Tareas />;
      case 'tutores': return <Tutores />;
      case 'eventos': return <Eventos />;
      case 'reportes': return <Reportes />;
      case 'reportes-financieros': return <ReportesFinancieros />;
      case 'usuarios': return <Usuarios />;
      case 'roles': return <Roles />;
      case 'limpiar-tablas': return <LimpiarTablas />;
      case 'cargar-tablas': return <CargarTablas />;
      case 'migracion-supabase': return <MigracionSupabase />;
      case 'inactivar-teens': return <InactivarTeens />;
      case 'ver-tablas': return <VerTablas />;
      case 'update-password': return <UpdatePassword navigateTo={navigateTo} />;
      default: return <Dashboard navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        currentPage={currentPage} 
        navigateTo={navigateTo} 
        isOpen={isSidebarOpen} 
        setOpen={setSidebarOpen} 
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-0 lg:ml-64">
        <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AppContent />
);

export default App;
