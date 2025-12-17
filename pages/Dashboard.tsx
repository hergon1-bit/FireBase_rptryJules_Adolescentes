import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { calcularEdad, formatDate, calcularProximoCumpleanos, formatCurrency, formatRelativeTime } from '../utils/helpers';
import { UsersIcon, ClipboardListIcon, CalendarDaysIcon, HeartHandshakeIcon, CheckCircleIcon, RefreshIcon, UserCheckIcon, TrophyIcon, KeyIcon } from '../components/ui/Icons';
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
    const { adolescentes, reuniones, encargados, tutores, eventos, celebraciones, asistencias, usuarios, roles, addCelebracionCumpleanos, fetchData } = useData();
    const { user, rol, hasPermission } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

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

    const eventosTrimestrales = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const threeMonthsLater = new Date(today);
        threeMonthsLater.setMonth(today.getMonth() + 3);

        return eventos
            .filter(e => {
                if (!e.fechaInicio) return false;
                const [y, m, d] = e.fechaInicio.split('-').map(Number);
                const eventDate = new Date(y, m - 1, d);
                return eventDate >= today && eventDate <= threeMonthsLater;
            })
            .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
    }, [eventos]);

    const topAsistentes = useMemo(() => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const reunionesUltimos6Meses = reuniones.filter(r => {
            const fechaReunion = new Date(r.fecha);
            return fechaReunion >= sixMonthsAgo && fechaReunion <= new Date();
        });
        
        const reunionesIds = new Set(reunionesUltimos6Meses.map(r => r.id));
        const totalReuniones = reunionesUltimos6Meses.length;

        const conteo: { [key: number]: number } = {};
        
        asistencias.forEach(a => {
            if (reunionesIds.has(Number(a.reunionId)) && a.estado === 'Presente') {
                const adoId = Number(a.adolescenteId);
                conteo[adoId] = (conteo[adoId] || 0) + 1;
            }
        });

        return Object.entries(conteo)
            .map(([id, count]) => {
                const ado = adolescentes.find(a => a.id === Number(id));
                return { 
                    ado, 
                    count, 
                    percentage: totalReuniones > 0 ? (count / totalReuniones) * 100 : 0 
                };
            })
            .filter(item => item.ado && item.ado.estado === 'Activo')
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

    }, [reuniones, asistencias, adolescentes]);


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

        const finalAdolescentes = cumpleanerosAdolescentes.filter(a => 
            !celebraciones.some(c => c.adolescenteId === a.id && c.ano === currentYear)
        );

        const finalEncargados = cumpleanerosEncargados.filter(e => 
            !celebraciones.some(c => c.adolescenteId === e.id && c.ano === currentYear)
        );

        return [...finalAdolescentes, ...finalEncargados].sort((a, b) => {
             const dateA = calcularProximoCumpleanos(a.fechaNacimiento);
             const dateB = calcularProximoCumpleanos(b.fechaNacimiento);
             return dateA.getDate() - dateB.getDate();
        });

    }, [stats.adolescentesActivosData, encargados, celebraciones]);

    // Lógica para actividad reciente de usuarios (Columna lateral)
    const usuariosRecientes = useMemo(() => {
        return [...usuarios]
            .filter(u => u.lastSignInAt)
            .sort((a, b) => new Date(b.lastSignInAt!).getTime() - new Date(a.lastSignInAt!).getTime())
            .slice(0, 5);
    }, [usuarios]);

    // Lógica para todos los usuarios (Tabla inferior - Solo Admins)
    const todosLosUsuarios = useMemo(() => {
        return [...usuarios].sort((a, b) => {
            const dateA = a.lastSignInAt ? new Date(a.lastSignInAt).getTime() : 0;
            const dateB = b.lastSignInAt ? new Date(b.lastSignInAt).getTime() : 0;
            return dateB - dateA;
        });
    }, [usuarios]);

    // Validación de Administrador más robusta (ID 1 o nombre flexible)
    const isAdmin = useMemo(() => {
        if (!rol) return false;
        return rol.id === 1 || rol.nombre?.toLowerCase().includes('administrador');
    }, [rol]);

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
        <div className="space-y-8 pb-12">
            <div className="flex items-center justify-between">
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
                {hasPermission('usuarios', 'read') && (
                    <button 
                        onClick={() => navigateTo('usuarios')}
                        className="text-sm text-primary hover:text-indigo-400 flex items-center gap-1 font-medium"
                    >
                        Ver todos los usuarios &rarr;
                    </button>
                )}
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
                {/* Columna Izquierda: Reuniones y Actividad */}
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

                    {/* Sección: Últimas Conexiones (Resumen) */}
                    {hasPermission('usuarios', 'read') && (
                        <div className="bg-surface p-6 rounded-lg shadow-lg">
                            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <KeyIcon className="w-5 h-5 text-secondary"/>
                                Actividad Reciente de Usuarios
                            </h2>
                            <div className="space-y-3">
                                {usuariosRecientes.length > 0 ? usuariosRecientes.map(u => (
                                    <div key={u.id} className="bg-background/50 p-3 rounded-md flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img 
                                                className="w-8 h-8 rounded-full border border-border" 
                                                src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.nombre}&background=random`} 
                                                alt={u.nombre} 
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">{u.nombre}</p>
                                                <p className="text-xs text-text-secondary">{roles.find(r => r.id === u.rolId)?.nombre}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded">
                                                {formatRelativeTime(u.lastSignInAt!)}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-text-secondary italic text-sm">No hay actividad reciente registrada.</p>
                                )}
                            </div>
                        </div>
                    )}

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

            {/* TABLA DE AUDITORIA DE USUARIOS (Última posición - Solo Administradores) */}
            {isAdmin && (
                <div className="bg-surface p-6 rounded-lg shadow-lg border border-border/50 animate-fade-in mt-12">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/20 p-2 rounded-lg">
                                <UsersIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-text-primary">
                                    Auditoría de Conexiones
                                </h2>
                                <p className="text-xs text-text-secondary">Monitoreo global de acceso al sistema</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                                Acceso Nivel Admin
                            </span>
                            {user && <span className="text-[10px] text-text-secondary mt-1">Sesión actual: {user.nombre}</span>}
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-background/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Usuario del Sistema</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Rol Asignado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-text-secondary uppercase tracking-widest">Email</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-text-secondary uppercase tracking-widest">Última Conexión (Fecha - Hora)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-surface/30">
                                {todosLosUsuarios.map((u) => (
                                    <tr key={u.id} className={`hover:bg-background/40 transition-colors ${u.id === user?.id ? 'bg-primary/5' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 shadow-inner ${u.id === user?.id ? 'bg-primary' : 'bg-gray-600'}`}>
                                                    {u.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-text-primary">
                                                        {u.nombre}
                                                        {u.id === user?.id && <span className="ml-2 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Tú</span>}
                                                    </div>
                                                    <div className="text-[10px] text-text-secondary font-mono">{u.id.substring(0, 8)}...</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${
                                                roles.find(r => r.id === u.rolId)?.nombre?.toLowerCase().includes('admin') 
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                                : 'bg-surface text-text-secondary border-border'
                                            }`}>
                                                {roles.find(r => r.id === u.rolId)?.nombre || 'Sin Rol'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary font-medium">
                                            {u.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {u.lastSignInAt ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-secondary">
                                                        {formatDate(u.lastSignInAt)}
                                                    </span>
                                                    <span className="text-[10px] text-text-secondary">
                                                        {formatRelativeTime(u.lastSignInAt)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm font-black text-red-600 bg-red-600/10 px-3 py-1 rounded animate-pulse">
                                                    NUNCA
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {todosLosUsuarios.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-text-secondary italic bg-background/20">
                                            Cargando lista de usuarios registrados...
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-text-secondary italic">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        <span>Los usuarios marcados en rojo nunca han iniciado sesión en esta cuenta.</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;