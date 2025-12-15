import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Adolescente, AsistenciaDetalle } from '../types';
import { RefreshIcon, PrinterIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'cumpleanos' | 'asistenciaReunion' | 'resumenAsistencia' | 'ausencias' | 'activos' | 'tutores' | 'pagosEvento';

const Reportes: React.FC = () => {
    const { adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, eventos, inscripciones, pagos, participantes, fetchData } = useData();
    const [activeReport, setActiveReport] = useState<ReportType>('cumpleanos');
    const [selectedReunionId, setSelectedReunionId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Actualizar datos al entrar a reportes para asegurar consistencia con la DB
    useEffect(() => {
        const loadFreshData = async () => {
            setIsRefreshing(true);
            await fetchData();
            setIsRefreshing(false);
        };
        loadFreshData();
    }, [fetchData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    }

    const reportData = useMemo(() => {
        switch (activeReport) {
            case 'cumpleanos':
                const currentMonth = new Date().getMonth();
                return adolescentes.filter(a => new Date(a.fechaNacimiento).getMonth() === currentMonth);
            
            case 'asistenciaReunion':
                if (!selectedReunionId) return [];
                // Virtual Join: Asistencias -> Adolescentes with Detail
                const asistentesData = asistencias
                    .filter(a => Number(a.reunionId) === Number(selectedReunionId) && a.estado === 'Presente')
                    .map(a => {
                        const adolescente = adolescentes.find(ado => ado.id === a.adolescenteId);
                        return adolescente ? { ...adolescente, asistenciaDetalle: a.detalle } : null;
                    })
                    .filter(Boolean); // Remove nulls
                return asistentesData as (Adolescente & { asistenciaDetalle?: AsistenciaDetalle })[];

            case 'resumenAsistencia':
                // Calcular total de activos para usar como base del 100%
                const totalAdolescentesActivos = adolescentes.filter(a => a.estado === 'Activo').length;

                // Filtramos las reuniones según el rango de fecha
                const filteredReuniones = reuniones.filter(r => {
                     if (!dateRange.start && !dateRange.end) return true;
                     const reunionDate = new Date(r.fecha);
                     const start = dateRange.start ? new Date(dateRange.start) : new Date('1900-01-01');
                     const end = dateRange.end ? new Date(dateRange.end) : new Date('2100-01-01');
                     return reunionDate >= start && reunionDate <= end;
                });

                // Generar resumen consolidado
                return filteredReuniones.map(r => {
                    const asisPorReunion = asistencias.filter(a => Number(a.reunionId) === Number(r.id));
                    const presentes = asisPorReunion.filter(a => a.estado === 'Presente').length;
                    
                    // Lógica ajustada: Usamos el total de activos como base si es mayor que los registros en DB.
                    // Esto corrige casos donde no se guardaron explícitamente los 'Ausentes' en la BD.
                    const dbTotalRegistros = asisPorReunion.length;
                    const totalBase = Math.max(dbTotalRegistros, totalAdolescentesActivos);
                    
                    // Calculamos ausentes basándonos en la base total real
                    const ausentes = totalBase - presentes;
                    
                    const porcentaje = totalBase > 0 ? ((presentes / totalBase) * 100).toFixed(1) : '0.0';
                    
                    const encargado = encargados.find(e => e.id === r.encargadoId);
                    
                    return {
                        id: r.id,
                        fecha: r.fecha,
                        tema: r.tema,
                        encargadoNombre: encargado ? `${encargado.nombre} ${encargado.apellido}` : 'N/A',
                        presentes,
                        ausentes,
                        totalRegistrados: totalBase,
                        porcentaje
                    };
                }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            case 'ausencias':
                if (!dateRange.start || !dateRange.end) return [];
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                const reunionesEnRangoIds = reuniones.filter(r => {
                    const fechaReunion = new Date(r.fecha);
                    return fechaReunion >= startDate && fechaReunion <= endDate;
                }).map(r => Number(r.id));
                
                const adolescentesPresentes = new Set(
                    asistencias
                        .filter(a => reunionesEnRangoIds.includes(Number(a.reunionId)) && a.estado === 'Presente')
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
    }, [activeReport, adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, eventos, inscripciones, pagos, participantes, selectedReunionId, dateRange]);

    const generarPDFAsistencia = () => {
        if (!selectedReunionId) return;
        
        const reunion = reuniones.find(r => r.id === selectedReunionId);
        if (!reunion) return;
        
        const encargado = encargados.find(e => e.id === reunion.encargadoId);
        const data = reportData as (Adolescente & { asistenciaDetalle?: AsistenciaDetalle })[];
        
        const doc = new jsPDF();
        const now = new Date().toLocaleString('es-PY');

        // Header
        doc.setFontSize(18);
        doc.text("Lista de Asistentes", 105, 15, { align: "center" });
        
        doc.setFontSize(10);
        doc.text(`Generado: ${now}`, 200, 15, { align: "right" });

        // Reunion Info Box
        doc.setDrawColor(0);
        doc.setFillColor(240, 240, 240);
        doc.rect(14, 25, 182, 30, 'F');
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Datos de la Reunión", 105, 32, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Col 1
        doc.text(`Nro Reunión: ${reunion.id}`, 20, 40);
        doc.text(`Fecha: ${formatDate(reunion.fecha)}`, 20, 48);
        
        // Col 2
        doc.text(`Tema: ${reunion.tema}`, 100, 40);
        doc.text(`Dirigido por: ${encargado ? `${encargado.nombre} ${encargado.apellido}` : 'N/A'}`, 100, 48);

        // Stats
        doc.setFont("helvetica", "bold");
        doc.text(`Total Presentes: ${data.length}`, 20, 60);

        // Table
        const tableBody = data.map(ado => [
            ado.nombre,
            ado.apellido,
            ado.cedula,
            ado.asistenciaDetalle || 'Regular'
        ]);

        autoTable(doc, {
            startY: 65,
            head: [['Nombre', 'Apellido', 'Cédula', 'Detalle']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] }, // Primary color match
            styles: { fontSize: 10, cellPadding: 3 },
            alternateRowStyles: { fillColor: [245, 245, 245] }
        });

        doc.save(`Asistentes_Reunion_${reunion.id}.pdf`);
    };

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
                        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4 justify-between">
                            <div className="w-full md:w-auto">
                                <label className="block text-sm font-medium text-text-secondary mb-1">Seleccionar Reunión para ver lista detallada:</label>
                                <select onChange={(e) => setSelectedReunionId(Number(e.target.value))} className="bg-background border border-border p-2 rounded-md w-full md:w-96">
                                    <option value="">-- Seleccione una reunión --</option>
                                    {reuniones.map(r => (
                                        <option key={r.id} value={r.id}>
                                            Nro. {r.id} - {r.tema} - {formatDate(r.fecha)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedReunionId && (reportData as any[]).length > 0 && (
                                <button 
                                    onClick={generarPDFAsistencia}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors shadow-md"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                    <span>Imprimir PDF</span>
                                </button>
                            )}
                        </div>
                        {selectedReunionId && (
                            <ReportTable headers={['Nombre', 'Apellido', 'Cédula', 'Detalle']}>
                                {(reportData as (Adolescente & { asistenciaDetalle?: string })[]).map(a => (
                                    <tr key={a.id}>
                                        <td className="p-2">{a.nombre}</td>
                                        <td className="p-2">{a.apellido}</td>
                                        <td className="p-2">{a.cedula}</td>
                                        <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                a.asistenciaDetalle === 'Primera Vez' ? 'bg-blue-500/20 text-blue-300' :
                                                a.asistenciaDetalle === 'Regresa' ? 'bg-yellow-500/20 text-yellow-300' :
                                                'bg-gray-700 text-gray-300'
                                            }`}>
                                                {a.asistenciaDetalle || 'Regular'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(reportData as any[]).length === 0 && (
                                    <tr><td colSpan={4} className="p-4 text-center text-text-secondary">No hay asistentes registrados para esta reunión.</td></tr>
                                )}
                            </ReportTable>
                        )}
                    </div>
                );
            case 'resumenAsistencia':
                return (
                    <div>
                        <div className="flex gap-4 mb-4 items-center">
                            <p className="text-sm font-medium text-text-secondary">Filtrar por fecha:</p>
                            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="bg-background border border-border p-2 rounded-md"/>
                            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="bg-background border border-border p-2 rounded-md"/>
                        </div>
                        <ReportTable headers={['Fecha', 'Tema', 'Encargado', 'Presentes', 'Ausentes', '% Asistencia']}>
                            {(reportData as any[]).map(row => (
                                <tr key={row.id}>
                                    <td className="p-2">{formatDate(row.fecha)}</td>
                                    <td className="p-2 font-medium text-white">{row.tema}</td>
                                    <td className="p-2 text-text-secondary text-sm">{row.encargadoNombre}</td>
                                    <td className="p-2 text-center text-green-400 font-bold">{row.presentes}</td>
                                    <td className="p-2 text-center text-red-400 font-bold">{row.ausentes}</td>
                                    <td className="p-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-16 bg-gray-700 rounded-full h-2">
                                                <div className="bg-primary h-2 rounded-full" style={{ width: `${row.porcentaje}%` }}></div>
                                            </div>
                                            <span className="text-xs">{row.porcentaje}%</span>
                                        </div>
                                    </td>
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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reportes</h1>
                <button 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    className="flex items-center gap-2 bg-surface hover:bg-gray-700 text-text-secondary px-3 py-2 rounded-lg transition-colors"
                >
                    <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Sincronizando...' : 'Refrescar Datos'}</span>
                </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <TabButton name="Resumen de Asistencia" id="resumenAsistencia" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Cumpleaños del Mes" id="cumpleanos" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Lista de Asistentes" id="asistenciaReunion" active={activeReport} setActive={setActiveReport} />
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
                    {headers.map(h => <th key={h} scope="col" className={`px-2 py-3 ${h.startsWith('N°') || h.startsWith('Total') || h.startsWith('Presentes') || h.startsWith('Ausentes') || h.startsWith('%') ? 'text-center' : 'text-left'}`}>{h}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {children}
            </tbody>
        </table>
    </div>
);

export default Reportes;