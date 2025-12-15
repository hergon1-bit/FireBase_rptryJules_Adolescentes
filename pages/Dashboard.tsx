import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { calcularEdad, formatDate, calcularProximoCumpleanos, formatCurrency } from '../utils/helpers';
import { UsersIcon, ClipboardListIcon, CalendarDaysIcon, HeartHandshakeIcon, CheckCircleIcon, RefreshIcon, UserCheckIcon, TrophyIcon } from '../components/ui/Icons';
import { Page } from '../types';


interface DashboardProps {
  navigateTo: (page: Page, params?: { reunionId: number }) => void;
}


const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string; onClick?: () => void }> = ({ icon, title, value, color, onClick }) => (
    <div 
        className={`bg-surface p-6 rounded-lg shadow-lg flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:bg-gray-700 transition-colors' : ''}`}
        onClick={onClick}
    >
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ navigateTo }) => {
    const { adolescentes, reuniones, encargados, tutores, eventos, celebraciones, asistencias, addCelebracionCumpleanos, fetchData } = useData();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Efecto para forzar la lectura de base de datos al entrar al Dashboard
    // Esto asegura que si vienes de "Cargar Tablas", los datos estén frescos.
    useEffect(() => {
        const loadFreshData = async () => {
            setIsLoading(true);
            await fetchData();
            setIsLoading(false);
        };
        loadFreshData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setIsLoading(true);
        await fetchData();
        setIsLoading(false);
    };
    
    const stats = useMemo(() => {
        // Robust filtering: case insensitive
        const adolescentesActivosData = adolescentes.filter(a => a.estado?.toLowerCase() === 'activo');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 7);

        const eventosProximos = eventos.filter(evento => {
            if (!evento.fechaInicio) return false;
            try {
                const dateParts = evento.fechaInicio.split(/[-/]/);
                if (dateParts.length !== 3) return false;
                const d = new Date(evento.fechaInicio);
                if (isNaN(d.getTime())) return false;
                return d >= today && d < sevenDaysLater;
            } catch {
                return false;
            }
        }).length;

        return {
            adolescentesActivos: adolescentesActivosData.length,
            reunionesTotales: reuniones.length,
            encargados: encargados.length,
            tutores: tutores.length,
            eventosProximos,
            adolescentesActivosData,
        };
    }, [adolescentes, reuniones, encargados, tutores, eventos]);
    
    const proximasReuniones = useMemo(() => reuniones
        .filter(r => {
             const d = new Date(r.fecha);
             return !isNaN(d.getTime()) && d >= new Date() && r.estado === 'En Proceso';
        })
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(0, 3), [reuniones]);

    // Lógica para eventos en los próximos 3 meses
    const eventosTrimestrales = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(today.getMonth() + 3);

        return eventos
            .filter(e => {
                if (!e.fechaInicio) return false;
                // Parseo manual para evitar problemas de zona horaria con strings YYYY-MM-DD
                const [y, m, d] = e.fechaInicio.split('-').map(Number);
                const eventDate = new Date(y, m - 1, d);
                return eventDate >= today && eventDate <= threeMonthsLater;
            })
            .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
    }, [eventos]);

    // Lógica para Top 10 Asistencia en últimos 6 meses
    const topAsistentes = useMemo(() => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        // 1. Obtener IDs de reuniones en el rango de fecha
        const reunionesUltimos6Meses = reuniones.filter(r => {
            const fechaReunion = new Date(r.fecha);
            return fechaReunion >= sixMonthsAgo && fechaReunion <= new Date();
        });
        
        const reunionesIds = new Set(reunionesUltimos6Meses.map(r => r.id));
        const totalReuniones = reunionesUltimos6Meses.length;

        // 2. Contar asistencias presentes por adolescente
        const conteo: { [key: number]: number } = {};
        
        asistencias.forEach(a => {
            // Solo considerar reuniones del periodo y estado Presente
            if (reunionesIds.has(Number(a.reunionId)) && a.estado === 'Presente') {
                const adoId = Number(a.adolescenteId);
                conteo[adoId] = (conteo[adoId] || 0) + 1;
            }
        });

        // 3. Mapear a objeto final y ordenar
        return Object.entries(conteo)
            .map(([id, count]) => {
                const ado = adolescentes.find(a => a.id === Number(id));
                return { 
                    ado, 
                    count, 
                    percentage: totalReuniones > 0 ? (count / totalReuniones) * 100 : 0 
                };
            })
            .filter(item => item.ado && item.ado.estado === 'Activo') // Solo activos
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10

    }, [reuniones, asistencias, adolescentes]);


    // Combined Birthdays Logic
    const proximosCumpleaneros = useMemo(() => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const currentYear = hoy.getFullYear();
        const currentMonth = hoy.getMonth();

        const cumpleanerosAdolescentes = stats.adolescentesActivosData.filter(a => {
            if (!a.fechaNacimiento) return false;
            const age = calcularEdad(a.fechaNacimiento);
            if (age === 0) return false;
            const nextBday = calcularProximoCumpleanos(a.fechaNacimiento);
            return nextBday.getMonth() === currentMonth;
        }).map(a => ({ ...a, tipo: 'Adolescente' as const }));

        const cumpleanerosEncargados = encargados.filter(e => {
            if (!e.fechaNacimiento) return false;
            const nextBday = calcularProximoCumpleanos(e.fechaNacimiento);
            return nextBday.getMonth() === currentMonth;
        }).map(e => ({ 
            ...e, 
            fechaNacimiento: e.fechaNacimiento!, 
            sexo: 'Masculino', 
            estado: 'Activo', 
            tipo: 'Encargado' as const 
        }));

        // Filtrar adolescentes ya celebrados
        const finalAdolescentes = cumpleanerosAdolescentes.filter(a => 
            !celebraciones.some(c => c.adolescenteId === a.id && c.ano === currentYear)
        );

        // Filtrar encargados ya celebrados
        const finalEncargados = cumpleanerosEncargados.filter(e => 
            !celebraciones.some(c => c.adolescenteId === e.id && c.ano === currentYear)
        );

        return [...finalAdolescentes, ...finalEncargados].sort((a, b) => {
             const dateA = calcularProximoCumpleanos(a.fechaNacimiento);
             const dateB = calcularProximoCumpleanos(b.fechaNacimiento);
             return dateA.getDate() - dateB.getDate();
        });

    }, [stats.adolescentesActivosData, encargados, celebraciones]);

    if (isLoading && reuniones.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center">
                 <div className="flex flex-col items-center gap-4">
                    <RefreshIcon className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-text-secondary">Sincronizando con base de datos...</p>
                 </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
                 <button 
                    onClick={handleRefresh} 
                    disabled={isLoading}
                    className="p-2 rounded-full text-text-secondary hover:bg-surface hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sincronizar ahora"
                >
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                {isLoading && <span className="text-sm text-secondary animate-pulse">Actualizando...</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                <StatCard 
                    icon={<UsersIcon className="text-white"/>} 
                    title="Adolescentes Activos" 
                    value={stats.adolescentesActivos} 
                    color="bg-blue-500" 
                    onClick={() => navigateTo('adolescentes')}
                />
                <StatCard 
                    icon={<ClipboardListIcon className="text-white"/>} 
                    title="Reuniones Totales" 
                    value={stats.reunionesTotales} 
                    color="bg-green-500" 
                    onClick={() => navigateTo('reuniones')}
                />
                <StatCard 
                    icon={<CalendarDaysIcon className="text-white"/>} 
                    title="Eventos Próximos (7d)" 
                    value={stats.eventosProximos} 
                    color="bg-orange-500" 
                    onClick={() => navigateTo('eventos')}
                />
                <StatCard 
                    icon={<UserCheckIcon className="text-white"/>} 
                    title="Encargados" 
                    value={stats.encargados} 
                    color="bg-purple-500" 
                    onClick={() => navigateTo('encargados')}
                />
                <StatCard 
                    icon={<HeartHandshakeIcon className="text-white"/>} 
                    title="Tutores Registrados" 
                    value={stats.tutores} 
                    color="bg-yellow-500" 
                    onClick={() => navigateTo('tutores')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Columna Izquierda: Reuniones y Eventos */}
                <div className="space-y-8">
                    <div className="bg-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <ClipboardListIcon className="w-5 h-5 text-primary"/> 
                            Próximas Reuniones
                        </h2>
                        <div className="space-y-4">
                            {proximasReuniones.length > 0 ? proximasReuniones.map(reunion => {
                                const encargado = encargados.find(e => e.id === reunion.encargadoId);
                                return (
                                    <div key={reunion.id} className="bg-background p-4 rounded-md flex justify-between items-center border-l-4 border-primary">
                                        <div>
                                            <p className="font-bold text-primary">{reunion.tema}</p>
                                            <p className="text-sm text-text-secondary">{formatDate(reunion.fecha)} - {encargado?.nombre} {encargado?.apellido}</p>
                                        </div>
                                        <button onClick={() => navigateTo('asistencia', { reunionId: reunion.id })} className="bg-primary text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700 transition">
                                            Asistencia
                                        </button>
                                    </div>
                                );
                            }) : (
                                <p className="text-text-secondary italic">No hay reuniones próximas programadas.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <CalendarDaysIcon className="w-5 h-5 text-orange-500"/>
                            Eventos (Próximos 3 Meses)
                        </h2>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {eventosTrimestrales.length > 0 ? eventosTrimestrales.map(evento => (
                                <div key={evento.id} className="bg-background p-4 rounded-md border-l-4 border-orange-500">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-text-primary">{evento.tema}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${evento.tieneCosto ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                                            {evento.tieneCosto ? formatCurrency(evento.costoPersona || 0) : 'Gratis'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-text-secondary grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="block text-xs font-semibold uppercase text-gray-500">Fecha</span>
                                            {formatDate(evento.fechaInicio)}
                                        </div>
                                        <div>
                                            <span className="block text-xs font-semibold uppercase text-gray-500">Lugar</span>
                                            {evento.lugar}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-text-secondary italic">No hay eventos programados para el próximo trimestre.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Cumpleaños y Top Asistencia */}
                <div className="space-y-8">
                    {/* Top 10 Asistencia */}
                    <div className="bg-surface p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <TrophyIcon className="w-5 h-5 text-yellow-400"/>
                            Top 10 Asistencia (6 Meses)
                        </h2>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {topAsistentes.length > 0 ? topAsistentes.map((item, index) => (
                                <div key={item.ado!.id} className="bg-background p-3 rounded-md flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                            index === 0 ? 'bg-yellow-500 text-black' :
                                            index === 1 ? 'bg-gray-400 text-black' :
                                            index === 2 ? 'bg-orange-700 text-white' : 'bg-surface border border-border text-text-secondary'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <p className="text-sm font-semibold text-text-primary truncate">{item.ado!.nombre} {item.ado!.apellido}</p>
                                                <p className="text-xs font-bold text-primary">{item.count} Asist.</p>
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                <div 
                                                    className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                                                    style={{ width: `${item.percentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-text-secondary italic">No hay datos de asistencia suficientes en los últimos 6 meses.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cumpleaños */}
                    <div className="bg-surface p-6 rounded-lg shadow-lg h-fit">
                        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <span className="text-yellow-500">🎂</span> Próximos Cumpleaños del Mes
                        </h2>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {proximosCumpleaneros.length > 0 ? proximosCumpleaneros.map(persona => (
                                <div key={`${persona.tipo}-${persona.id}`} className="bg-background p-3 rounded-md flex items-center justify-between hover:bg-gray-800 transition-colors">
                                    <div className="flex items-center space-x-3">
                                        <img src={`https://ui-avatars.com/api/?name=${persona.nombre}+${persona.apellido}&background=random`} alt="avatar" className="w-10 h-10 rounded-full" />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-text-primary">{persona.nombre} {persona.apellido}</p>
                                                {persona.tipo === 'Encargado' && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">Encargado</span>}
                                            </div>
                                            <p className="text-sm text-text-secondary">Cumple {calcularEdad(persona.fechaNacimiento) + 1} años</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center space-x-3">
                                        <p className="font-bold text-secondary text-sm">{new Date(calcularProximoCumpleanos(persona.fechaNacimiento)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                                        <button
                                            onClick={() => addCelebracionCumpleanos(persona.id, new Date().getFullYear())}
                                            title="Marcar como celebrado"
                                            className="p-1.5 rounded-full text-gray-400 hover:text-green-400 hover:bg-green-400/10 transition-all"
                                        >
                                            <CheckCircleIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-text-secondary italic">No hay cumpleaños próximos este mes.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;