import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { calcularEdad, formatDate, calcularProximoCumpleanos } from '../utils/helpers';
import { UsersIcon, ClipboardListIcon, CalendarDaysIcon, HeartHandshakeIcon, CheckCircleIcon, RefreshIcon, UserCheckIcon } from '../components/ui/Icons';
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
    const { adolescentes, reuniones, encargados, tutores, eventos, asistencias, celebraciones, addCelebracionCumpleanos, fetchData } = useData();
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

        const finalAdolescentes = cumpleanerosAdolescentes.filter(a => 
            !celebraciones.some(c => c.adolescenteId === a.id && c.ano === currentYear)
        );

        return [...finalAdolescentes, ...cumpleanerosEncargados].sort((a, b) => {
             const dateA = calcularProximoCumpleanos(a.fechaNacimiento);
             const dateB = calcularProximoCumpleanos(b.fechaNacimiento);
             return dateA.getDate() - dateB.getDate();
        });

    }, [stats.adolescentesActivosData, encargados, celebraciones]);

    // --- Chart Data (Attendance Trend) ---
    const attendanceTrend = useMemo(() => {
        // Ordenar reuniones por fecha ascendente para el gráfico, manejando fechas inválidas
        const sortedReuniones = [...reuniones].sort((a, b) => {
             const dateA = new Date(a.fecha).getTime();
             const dateB = new Date(b.fecha).getTime();
             return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
        });
        
        // Tomar las últimas 10
        const last10 = sortedReuniones.slice(-10);

        return last10.map(r => {
            // Robust comparison: coerce IDs to strings or numbers to handle potential mismatch
            const presentes = asistencias.filter(a => Number(a.reunionId) === Number(r.id) && a.estado === 'Presente').length;
            const ausentes = asistencias.filter(a => Number(a.reunionId) === Number(r.id) && a.estado === 'Ausente').length;
            
            return {
                name: r.tema.length > 10 ? r.tema.substring(0, 10) + '...' : r.tema, // Short name for X-Axis
                fullTema: r.tema,
                fecha: formatDate(r.fecha),
                Presentes: presentes,
                Ausentes: ausentes
            };
        });
    }, [reuniones, asistencias]);
    
    // Age Distribution Logic
    const ageDistribution = useMemo(() => {
        const groups: Record<string, number> = { 
            '0-11': 0, 
            '12-13': 0, 
            '14-15': 0, 
            '16-17': 0, 
            '18+': 0 
        };
        
        adolescentes.forEach(a => {
            // Usamos calcularEdad que ya es robusto
            const age = calcularEdad(a.fechaNacimiento);
            
            if (age < 12) groups['0-11']++;
            else if (age <= 13) groups['12-13']++;
            else if (age <= 15) groups['14-15']++;
            else if (age <= 17) groups['16-17']++;
            else groups['18+']++;
        });
        
        return Object.entries(groups).map(([name, value]) => ({ name, 'Cantidad': value }));
    }, [adolescentes]);

    // Lógica mejorada: Buscar la última reunión que tenga registros de asistencia asociados
    const lastMeetingAttendance = useMemo(() => {
        // Ordenar reuniones de más reciente a más antigua
        const sortedMeetings = [...reuniones].sort((a, b) => {
             const dateA = new Date(a.fecha).getTime();
             const dateB = new Date(b.fecha).getTime();
             return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        });
        
        // Encontrar la primera reunión (la más reciente) que tenga al menos un registro de asistencia
        // Esto evita mostrar el gráfico vacío si la última reunión creada aun no tiene lista tomada
        const lastMeetingWithData = sortedMeetings.find(r => {
            return asistencias.some(a => Number(a.reunionId) === Number(r.id));
        });

        const targetMeeting = lastMeetingWithData || sortedMeetings[0];

        if (!targetMeeting) return { data: [], title: 'No hay reuniones registradas' };

        // Robust filter
        const meetingAsistencias = asistencias.filter(a => Number(a.reunionId) === Number(targetMeeting.id));
        
        // Contamos explícitamente cuántas filas tienen estado Presente y cuántas Ausente
        const presentes = meetingAsistencias.filter(a => a.estado === 'Presente').length;
        const ausentes = meetingAsistencias.filter(a => a.estado === 'Ausente').length;
        
        if (presentes === 0 && ausentes === 0) {
            return { data: [], title: `Asistencia: ${targetMeeting.tema} (Sin datos)` };
        }

        return {
            data: [ { name: 'Presentes', value: presentes }, { name: 'Ausentes', value: ausentes }, ],
            title: `Asistencia: ${targetMeeting.tema} (${formatDate(targetMeeting.fecha)})`
        };
    }, [reuniones, asistencias]);

    const PIE_COLORS = ['#10b981', '#ef4444'];

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
                <StatCard icon={<UsersIcon className="text-white"/>} title="Adolescentes Activos" value={stats.adolescentesActivos} color="bg-blue-500" />
                <StatCard icon={<ClipboardListIcon className="text-white"/>} title="Reuniones Totales" value={stats.reunionesTotales} color="bg-green-500" />
                <StatCard icon={<CalendarDaysIcon className="text-white"/>} title="Eventos Próximos (7d)" value={stats.eventosProximos} color="bg-orange-500" />
                <StatCard icon={<UserCheckIcon className="text-white"/>} title="Encargados" value={stats.encargados} color="bg-purple-500" />
                <StatCard icon={<HeartHandshakeIcon className="text-white"/>} title="Tutores Registrados" value={stats.tutores} color="bg-yellow-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-surface p-6 rounded-lg shadow-lg flex flex-col">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Tendencia de Asistencia (Últimas 10 Reuniones)</h2>
                    <div className="w-full h-[300px] flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#d1d5db" fontSize={12} interval={0} angle={-15} textAnchor="end" height={50} />
                                <YAxis stroke="#d1d5db" allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} 
                                    cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                                    labelFormatter={(label, payload) => {
                                        if (payload && payload.length > 0) {
                                            const item = payload[0].payload;
                                            return `${item.fullTema} (${item.fecha})`;
                                        }
                                        return label;
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="Presentes" fill="#10b981" />
                                <Bar dataKey="Ausentes" fill="#ef4444" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="lg:col-span-1 bg-surface p-6 rounded-lg shadow-lg flex flex-col">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Distribución por Edades</h2>
                    {adolescentes.length > 0 ? (
                    <div className="w-full h-[300px] flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                <XAxis type="number" stroke="#d1d5db" allowDecimals={false} />
                                <YAxis type="category" dataKey="name" stroke="#d1d5db" width={50} fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }} 
                                    cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                                />
                                <Bar dataKey="Cantidad" name="Adolescentes" fill="#10b981" barSize={24} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-text-secondary text-center p-4">
                            No hay adolescentes registrados para calcular edades.
                        </div>
                    )}
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
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent, value }) => value > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                                >
                                    {lastMeetingAttendance.data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                           <p className="text-text-secondary text-center px-4">
                               {asistencias.length === 0 
                               ? "No hay datos de asistencia en el sistema." 
                               : "No hay asistencia registrada para esta reunión."}
                           </p>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1 bg-surface p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold text-text-primary mb-4">Próximos Cumpleaños del Mes</h2>
                     <div className="space-y-3 max-h-64 overflow-y-auto">
                        {proximosCumpleaneros.length > 0 ? proximosCumpleaneros.map(persona => (
                            <div key={`${persona.tipo}-${persona.id}`} className="bg-background p-3 rounded-md flex items-center justify-between">
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
                                <div className="text-right flex items-center space-x-4">
                                     <p className="font-bold text-secondary">{new Date(calcularProximoCumpleanos(persona.fechaNacimiento)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                                     {persona.tipo === 'Adolescente' && (
                                         <button
                                            onClick={() => addCelebracionCumpleanos(persona.id, new Date().getFullYear())}
                                            title="Marcar como celebrado"
                                            className="p-2 rounded-full text-green-400 hover:bg-green-500/20"
                                         >
                                             <CheckCircleIcon className="w-5 h-5" />
                                         </button>
                                     )}
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

export default Dashboard;