
import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { calcularEdad, formatDate, calcularProximoCumpleanos } from '../utils/helpers';
import { UsersIcon, ClipboardListIcon, CalendarDaysIcon, HeartHandshakeIcon, CheckCircleIcon, RefreshIcon } from '../components/ui/Icons';
import { Adolescente, Reunion, Page } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';


interface DashboardProps {
  navigateTo: (page: Page, params?: { reunionId: number }) => void;
}


const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-surface p-6 rounded-lg shadow-lg flex items-center space-x-4">
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
    const { adolescentes, reuniones, encargados, tutores, asistencias, celebraciones, addCelebracionCumpleanos, fetchData } = useData();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleRefresh = async () => {
        setIsLoading(true);
        await fetchData();
        setIsLoading(false);
    };
    
    const stats = useMemo(() => {
        const adolescentesActivosData = adolescentes.filter(a => a.estado === 'Activo');
        return {
            adolescentesActivos: adolescentesActivosData.length,
            reunionesTotales: reuniones.length,
            encargados: encargados.length,
            tutores: tutores.length,
            adolescentesActivosData,
        };
    }, [adolescentes, reuniones, encargados, tutores]);
    
    const proximasReuniones = useMemo(() => reuniones
        .filter(r => new Date(r.fecha) >= new Date() && r.estado === 'En Proceso')
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
        .slice(0, 3), [reuniones]);

    const proximosCumpleanerosDelMes = useMemo(() => stats.adolescentesActivosData.filter(a => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Compare against start of today
        
        const [, month, day] = a.fechaNacimiento.split('-').map(Number);
        const cumpleEsteAno = new Date(hoy.getFullYear(), month - 1, day);
        
        const yaCelebrado = celebraciones.some(c => c.adolescenteId === a.id && c.ano === hoy.getFullYear());
        
        return cumpleEsteAno.getMonth() === hoy.getMonth() && cumpleEsteAno >= hoy && !yaCelebrado;
    }).sort((a,b) => {
        const dayA = parseInt(a.fechaNacimiento.split('-')[2]);
        const dayB = parseInt(b.fechaNacimiento.split('-')[2]);
        return dayA - dayB;
    }), [stats.adolescentesActivosData, celebraciones]);

    // --- Chart Data ---
    const meetingsPerMonth = useMemo(() => {
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        const counts = new Map<string, number>();
        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    
        const monthKeys: string[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(todayUTC);
            d.setUTCMonth(todayUTC.getUTCMonth() - i, 1);
            const key = `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear().toString().slice(2)}`;
            monthKeys.push(key);
            counts.set(key, 0);
        }
        
        const sixMonthsAgoUTC = new Date(todayUTC);
        sixMonthsAgoUTC.setUTCMonth(sixMonthsAgoUTC.getUTCMonth() - 5, 1);
        
        reuniones.forEach(r => {
            const [y, m, d] = r.fecha.split('-').map(Number);
            const meetingDate = new Date(Date.UTC(y, m - 1, d));
    
            if (meetingDate >= sixMonthsAgoUTC && meetingDate <= todayUTC) {
                const key = `${monthNames[meetingDate.getUTCMonth()]} ${meetingDate.getUTCFullYear().toString().slice(2)}`;
                if (counts.has(key)) {
                    counts.set(key, counts.get(key)! + 1);
                }
            }
        });
    
        return monthKeys.map(name => ({ name, 'Reuniones': counts.get(name) || 0 }));
    }, [reuniones]);
    
    const ageDistribution = useMemo(() => {
        const groups = { '12-13': 0, '14-15': 0, '16-17': 0, '18+': 0, };
        stats.adolescentesActivosData.forEach(a => {
            const age = calcularEdad(a.fechaNacimiento);
            if (age <= 13) groups['12-13']++;
            else if (age <= 15) groups['14-15']++;
            else if (age <= 17) groups['16-17']++;
            else groups['18+']++;
        });
        return Object.entries(groups).map(([name, value]) => ({ name, 'Adolescentes': value }));
    }, [stats.adolescentesActivosData]);

    const lastMeetingAttendance = useMemo(() => {
        const lastFinishedMeeting = reuniones
            .filter(r => r.estado === 'Finalizado')
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())[0];

        if (!lastFinishedMeeting) return { data: [], title: 'No hay reuniones finalizadas' };

        // Base the chart on currently active adolescents for consistency with the stat card
        const activeAdolescentIds = new Set(stats.adolescentesActivosData.map(a => a.id));

        const meetingAsistencias = asistencias.filter(a => a.reunionId === lastFinishedMeeting.id);
        
        // Count only currently active adolescents who were present
        const presentes = meetingAsistencias.filter(a => 
            a.estado === 'Presente' && activeAdolescentIds.has(a.adolescenteId)
        ).length;
        
        const totalActivos = activeAdolescentIds.size;
        const ausentes = totalActivos - presentes;

        if (totalActivos === 0) {
            return { data: [], title: `Asistencia: ${lastFinishedMeeting.tema}` };
        }

        return {
            data: [ { name: 'Presentes', value: presentes }, { name: 'Ausentes', value: ausentes }, ],
            title: `Asistencia (Activos): ${lastFinishedMeeting.tema}`
        };
    }, [reuniones, asistencias, stats.adolescentesActivosData]);

    const PIE_COLORS = ['#10b981', '#ef4444'];

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
                 <button 
                    onClick={handleRefresh} 
                    disabled={isLoading}
                    className="p-2 rounded-full text-text-secondary hover:bg-surface hover:text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refrescar datos"
                >
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<UsersIcon className="text-white"/>} title="Adolescentes Activos" value={stats.adolescentesActivos} color="bg-blue-500" />
                <StatCard icon={<ClipboardListIcon className="text-white"/>} title="Reuniones Totales" value={stats.reunionesTotales} color="bg-green-500" />
                <StatCard icon={<UserCheckIcon className="text-white"/>} title="Encargados" value={stats.encargados} color="bg-purple-500" />
                <StatCard icon={<HeartHandshakeIcon className="text-white"/>} title="Tutores Registrados" value={stats.tutores} color="bg-yellow-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Reuniones por Mes (Últimos 6 meses)</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={meetingsPerMonth} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#d1d5db" fontSize={12} />
                            <YAxis stroke="#d1d5db" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}/>
                            <Legend />
                            <Bar dataKey="Reuniones" fill="#4f46e5" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-1 bg-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Distribución por Edades</h2>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={ageDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis type="number" stroke="#d1d5db" />
                            <YAxis type="category" dataKey="name" stroke="#d1d5db" width={40} fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}/>
                            <Bar dataKey="Adolescentes" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Próximas Reuniones</h2>
                    <div className="space-y-4">
                        {proximasReuniones.length > 0 ? proximasReuniones.map(reunion => {
                            const encargado = encargados.find(e => e.id === reunion.encargadoId);
                            return (
                                <div key={reunion.id} className="bg-background p-4 rounded-md flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-primary">{reunion.tema}</p>
                                        <p className="text-sm text-text-secondary">{formatDate(reunion.fecha)} - {encargado?.nombre} {encargado?.apellido}</p>
                                    </div>
                                    <button onClick={() => navigateTo('asistencia', { reunionId: reunion.id })} className="bg-primary text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700 transition">
                                        Tomar Asistencia
                                    </button>
                                </div>
                            );
                        }) : (
                            <p className="text-text-secondary">No hay reuniones próximas programadas.</p>
                        )}
                    </div>
                </div>

                 <div className="lg:col-span-1 bg-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-text-primary mb-4 truncate" title={lastMeetingAttendance.title}>{lastMeetingAttendance.title}</h2>
                    {lastMeetingAttendance.data.length > 0 && (lastMeetingAttendance.data[0].value > 0 || lastMeetingAttendance.data[1].value > 0) ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={lastMeetingAttendance.data}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent, value }) => value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                                >
                                    {lastMeetingAttendance.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                           <p className="text-text-secondary text-center">No hay datos de asistencia para esta reunión.</p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 bg-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Próximos Cumpleaños del Mes</h2>
                     <div className="space-y-3 max-h-64 overflow-y-auto">
                        {proximosCumpleanerosDelMes.length > 0 ? proximosCumpleanerosDelMes.map(ado => (
                            <div key={ado.id} className="bg-background p-3 rounded-md flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <img src={`https://i.pravatar.cc/150?u=${ado.id}`} alt="avatar" className="w-10 h-10 rounded-full" />
                                    <div>
                                        <p className="font-semibold text-text-primary">{ado.nombre} {ado.apellido}</p>
                                        <p className="text-sm text-text-secondary">Cumple {calcularEdad(ado.fechaNacimiento) + 1} años</p>
                                    </div>
                                </div>
                                <div className="text-right flex items-center space-x-4">
                                     <p className="font-bold text-secondary">{new Date(calcularProximoCumpleanos(ado.fechaNacimiento)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                                     <button
                                        onClick={() => addCelebracionCumpleanos(ado.id, new Date().getFullYear())}
                                        title="Marcar como celebrado"
                                        className="text-gray-400 hover:text-green-400 transition-colors"
                                     >
                                        <CheckCircleIcon className="w-5 h-5"/>
                                     </button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-text-secondary">No hay cumpleaños próximos este mes.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const UserCheckIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg xmlns="http://www.w.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline>
  </svg>
);

export default Dashboard;
