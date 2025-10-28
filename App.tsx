
import React, { useState, useMemo, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Adolescentes from './pages/Adolescentes';
import Encargados from './pages/Encargados';
import Reuniones from './pages/Reuniones';
import Tutores from './pages/Tutores';
import Eventos from './pages/Eventos';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Roles from './pages/Roles';
import Asistencia from './pages/Asistencia';
import LimpiarTablas from './pages/LimpiarTablas';
import CargarTablas from './pages/CargarTablas';
import { Page } from './types';

const AppContent: React.FC = () => {
    const { user } = useAuth();
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [selectedReunionId, setSelectedReunionId] = useState<number | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const navigateTo = useCallback((page: Page, params?: { reunionId?: number }) => {
        setCurrentPage(page);
        if (params?.reunionId) {
            setSelectedReunionId(params.reunionId);
        }
    }, []);

    const renderPage = () => {
        if (currentPage === 'asistencia' && selectedReunionId) {
            return <Asistencia reunionId={selectedReunionId} navigateTo={navigateTo} />;
        }
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard navigateTo={navigateTo} />;
            case 'adolescentes':
                return <Adolescentes />;
            case 'encargados':
                return <Encargados />;
            case 'reuniones':
                return <Reuniones navigateTo={navigateTo} />;
            case 'tutores':
                return <Tutores />;
            case 'eventos':
                return <Eventos />;
            case 'reportes':
                return <Reportes />;
            case 'usuarios':
                return <Usuarios />;
            case 'roles':
                return <Roles />;
            case 'limpiar-tablas':
                return <LimpiarTablas />;
            case 'cargar-tablas':
                return <CargarTablas />;
            default:
                return <Dashboard navigateTo={navigateTo} />;
        }
    };

    if (!user) {
        return <LoginPage />;
    }

    return (
        <div className="flex h-screen bg-background">
            <Sidebar currentPage={currentPage} navigateTo={navigateTo} isOpen={isSidebarOpen} setOpen={setSidebarOpen} />
            <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? 'sm:ml-64' : 'sm:ml-0'}`}>
                <Header toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 md:p-6 lg:p-8">
                    {renderPage()}
                </main>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    return (
        <AuthProvider>
            <DataProvider>
                <AppContent />
            </DataProvider>
        </AuthProvider>
    );
};

export default App;