import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Adolescente } from '../types';

type ReportType = 'cumpleanos' | 'asistenciaReunion' | 'ausencias' | 'activos' | 'tutores' | 'pagosEvento';

const Reportes: React.FC = () => {
    const { adolescentes, reuniones, asistencias, tutores, tutoresAdolescentes, eventos, inscripciones, pagos, participantes } = useData();
    const [activeReport, setActiveReport] = useState<ReportType>('cumpleanos');
    const [selectedReunionId, setSelectedReunionId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const reportData = useMemo(() => {
        switch (activeReport) {
            case 'cumpleanos':
                const currentMonth = new Date().getMonth();
                return adolescentes.filter(a => new Date(a.fechaNacimiento).getMonth() === currentMonth);
            
            case 'asistenciaReunion':
                if (!selectedReunionId) return [];
                const asistentesIds = asistencias
                    .filter(a => a.reunionId === selectedReunionId && a.estado === 'Presente')
                    .map(a => a.adolescenteId);
                return adolescentes.filter(a => asistentesIds.includes(a.id));

            case 'ausencias':
                if (!dateRange.start || !dateRange.end) return [];
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                const reunionesEnRango = reuniones.filter(r => {
                    const fechaReunion = new Date(r.fecha);
                    return fechaReunion >= startDate && fechaReunion <= endDate;
                }).map(r => r.id);
                
                const adolescentesPresentes = new Set(
                    asistencias
                        .filter(a => reunionesEnRango.includes(a.reunionId) && a.estado === 'Presente')
                        .map(a => a.adolescenteId)
                );
                return adolescentes.filter(a => a.estado === 'Activo' && !adolescentesPresentes.has(a.id));

            case 'activos':
                return adolescentes.filter(a => a.estado === 'Activo');
            
            case 'tutores':
                 return adolescentes.map(ado => ({
                    ...ado,
                    tutores: tutoresAdolescentes
                        .filter(ta => ta.adolescenteId === ado.id)
                        .map(ta => tutores.find(t => t.id === ta.tutorId))
                        .filter(Boolean)
                }));
            
            case 'pagosEvento':
                let filteredEvents = eventos;
                if (dateRange.start && dateRange.end) {
                    const startDate = new Date(dateRange.start);
                    // Add 1 day to end date to include the whole day
                    const endDate = new Date(dateRange.end);
                    endDate.setDate(endDate.getDate() + 1);

                    filteredEvents = eventos.filter(e => {
                        const eventDate = new Date(e.fechaInicio);
                        return eventDate >= startDate && eventDate <= endDate;
                    });
                }
                
                return filteredEvents.map(evento => {
                    const eventoInscripciones = inscripciones.filter(i => i.eventoId === evento.id);
                    const inscripcionIds = eventoInscripciones.map(i => i.id);
                    
                    const totalRecaudado = pagos
                        .filter(p => inscripcionIds.includes(p.inscripcionId))
                        .reduce((sum, p) => sum + p.monto, 0);
                        
                    const participantesCount = participantes.filter(p => p.eventoId === evento.id).length;
                    
                    return {
                        ...evento,
                        totalRecaudado,
                        participantesCount
                    };
                });

            default:
                return [];
        }
    }, [activeReport, adolescentes, reuniones, asistencias, tutores, tutoresAdolescentes, eventos, inscripciones, pagos, participantes, selectedReunionId, dateRange]);

    const renderReportContent = () => {
        switch (activeReport) {
            case 'cumpleanos':
                return (
                    <ReportTable headers={['Nombre', 'Teléfono', 'Fecha Cumpleaños']}>
                        {(reportData as typeof adolescentes).map(a => (
                            <tr key={a.id}>
                                <td className="p-2">{a.nombre} {a.apellido}</td>
                                <td className="p-2">{a.telefono}</td>
                                <td className="p-2">{formatDate(a.fechaNacimiento)}</td>
                            </tr>
                        ))}
                    </ReportTable>
                );
             case 'asistenciaReunion':
                return (
                     <div>
                        <select onChange={(e) => setSelectedReunionId(Number(e.target.value))} className="bg-background border border-border p-2 rounded-md mb-4">
                            <option>Seleccione una reunión</option>
                            {reuniones.map(r => <option key={r.id} value={r.id}>{r.tema} - {formatDate(r.fecha)}</option>)}
                        </select>
                        <ReportTable headers={['Nombre', 'Apellido', 'Cédula']}>
                            {(reportData as Adolescente[]).map(a => (
                                <tr key={a.id}>
                                    <td className="p-2">{a.nombre}</td>
                                    <td className="p-2">{a.apellido}</td>
                                    <td className="p-2">{a.cedula}</td>
                                </tr>
                            ))}
                        </ReportTable>
                    </div>
                );
            case 'ausencias':
                return (
                     <div>
                        <div className="flex gap-4 mb-4">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="bg-background border border-border p-2 rounded-md"/>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="bg-background border border-border p-2 rounded-md"/>
                        </div>
                        <ReportTable headers={['Nombre', 'Apellido', 'Teléfono']}>
                            {(reportData as Adolescente[]).map(a => (
                                <tr key={a.id}>
                                    <td className="p-2">{a.nombre}</td>
                                    <td className="p-2">{a.apellido}</td>
                                    <td className="p-2">{a.telefono}</td>
                                </tr>
                            ))}
                        </ReportTable>
                    </div>
                );
             case 'activos':
                return (
                    <ReportTable headers={['Nombre', 'Cédula', 'Teléfono', 'Ciudad']}>
                        {(reportData as Adolescente[]).map(a => (
                            <tr key={a.id}>
                                <td className="p-2">{a.nombre} {a.apellido}</td>
                                <td className="p-2">{a.cedula}</td>
                                <td className="p-2">{a.telefono}</td>
                                <td className="p-2">{a.ciudad}</td>
                            </tr>
                        ))}
                    </ReportTable>
                );
            case 'tutores':
                 return (
                    <ReportTable headers={['Adolescente', 'Tutores']}>
                        {(reportData as any[]).map(item => (
                            <tr key={item.id}>
                                <td className="p-2">{item.nombre} {item.apellido}</td>
                                <td className="p-2">{item.tutores.map((t: any) => `${t.nombre} ${t.apellido} (${t.parentesco})`).join(', ')}</td>
                            </tr>
                        ))}
                    </ReportTable>
                 );
            case 'pagosEvento':
                return (
                    <div>
                        <div className="flex gap-4 mb-4">
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="bg-background border border-border p-2 rounded-md" placeholder="Fecha de inicio"/>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="bg-background border border-border p-2 rounded-md" placeholder="Fecha de fin"/>
                        </div>
                        <ReportTable headers={['Evento', 'Fecha', 'N° Participantes', 'Total Recaudado']}>
                            {(reportData as any[]).map(item => (
                                <tr key={item.id}>
                                    <td className="p-2">{item.tema}</td>
                                    <td className="p-2">{formatDate(item.fechaInicio)}</td>
                                    <td className="p-2 text-center">{item.participantesCount}</td>
                                    <td className="p-2 text-right font-mono">{formatCurrency(item.totalRecaudado)}</td>
                                </tr>
                            ))}
                        </ReportTable>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Reportes</h1>
            <div className="flex flex-wrap gap-2">
                <TabButton name="Cumpleaños del Mes" id="cumpleanos" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Asistencia por Reunión" id="asistenciaReunion" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Ausencias por Período" id="ausencias" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Adolescentes Activos" id="activos" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Adolescentes y Tutores" id="tutores" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Pagos de Eventos" id="pagosEvento" active={activeReport} setActive={setActiveReport} />
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                {renderReportContent()}
            </div>
        </div>
    );
};

const TabButton: React.FC<{name: string, id: ReportType, active: ReportType, setActive: (id: ReportType) => void}> = ({name, id, active, setActive}) => (
    <button onClick={() => setActive(id)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${active === id ? 'bg-primary text-white' : 'bg-background hover:bg-gray-700'}`}>
        {name}
    </button>
);

const ReportTable: React.FC<{headers: string[], children: React.ReactNode}> = ({headers, children}) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-text-secondary">
            <thead className="text-xs text-text-primary uppercase bg-background">
                <tr>
                    {headers.map(h => <th key={h} scope="col" className={`px-2 py-3 ${h.startsWith('N°') || h.startsWith('Total') ? 'text-center' : 'text-left'}`}>{h}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {children}
            </tbody>
        </table>
    </div>
);

export default Reportes;