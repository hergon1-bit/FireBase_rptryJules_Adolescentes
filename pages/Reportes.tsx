
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, calcularEdad } from '../utils/helpers';
import { Adolescente } from '../types';
import { RefreshIcon, PrinterIcon, UsersIcon, CalendarDaysIcon, ClipboardListIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'cumpleanos' | 'asistenciaReunion' | 'ausencias' | 'activos';

const Reportes: React.FC = () => {
    const { 
        adolescentes, reuniones, asistencias, fetchData 
    } = useData();
    const [activeReport, setActiveReport] = useState<ReportType>('cumpleanos');
    const [selectedReunionId, setSelectedReunionId] = useState<number | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

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
                return adolescentes
                    .filter(a => a.estado === 'Activo' && a.fechaNacimiento && new Date(a.fechaNacimiento).getMonth() === currentMonth)
                    .sort((a, b) => new Date(a.fechaNacimiento).getDate() - new Date(b.fechaNacimiento).getDate());

            case 'activos':
                return adolescentes.filter(a => a.estado === 'Activo').sort((a,b) => a.nombre.localeCompare(b.nombre));

            case 'ausencias':
                // Adolescentes con más de 3 ausencias en las últimas 5 reuniones
                const ultimas5 = reuniones.slice(0, 5).map(r => r.id);
                return adolescentes.filter(a => {
                    if (a.estado !== 'Activo') return false;
                    const ausencias = asistencias.filter(asis => ultimas5.includes(asis.reunionId) && asis.adolescenteId === a.id && asis.estado === 'Ausente');
                    return ausencias.length >= 3;
                });

            case 'asistenciaReunion':
                if (!selectedReunionId) return [];
                return asistencias
                    .filter(a => a.reunionId === selectedReunionId && a.estado === 'Presente')
                    .map(a => adolescentes.find(ado => ado.id === a.adolescenteId))
                    .filter(Boolean) as Adolescente[];

            default: return [];
        }
    }, [activeReport, adolescentes, reuniones, asistencias, selectedReunionId]);

    const handlePrint = () => {
        const doc = new jsPDF();
        const title = activeReport.toUpperCase();
        doc.text(`Reporte de Seguimiento: ${title}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

        const tableData = (reportData as Adolescente[]).map(a => [
            `${a.nombre} ${a.apellido}`,
            a.cedula,
            calcularEdad(a.fechaNacimiento).toString(),
            a.barrio || 'N/A',
            a.telefono || 'N/A'
        ]);

        autoTable(doc, {
            startY: 28,
            head: [['Nombre', 'Cédula', 'Edad', 'Barrio', 'Teléfono']],
            body: tableData,
        });

        doc.save(`reporte_${activeReport}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reportes de Seguimiento</h1>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="bg-surface border border-border p-2 rounded-lg text-text-secondary hover:text-text-primary">
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleRefresh} className="p-2 text-text-secondary hover:text-primary transition-colors">
                        <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveReport('cumpleanos')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'cumpleanos' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}>
                    <CalendarDaysIcon className="w-4 h-4" /> Cumpleaños del Mes
                </button>
                <button onClick={() => setActiveReport('ausencias')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'ausencias' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}>
                    <UsersIcon className="w-4 h-4" /> Alerta de Ausencias
                </button>
                <button onClick={() => setActiveReport('activos')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'activos' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}>
                    <UsersIcon className="w-4 h-4" /> Lista de Activos
                </button>
                <button onClick={() => setActiveReport('asistenciaReunion')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'asistenciaReunion' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'}`}>
                    <ClipboardListIcon className="w-4 h-4" /> Asistencia por Reunión
                </button>
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                {activeReport === 'asistenciaReunion' && (
                    <div className="mb-6">
                        <select 
                            value={selectedReunionId || ''} 
                            onChange={e => setSelectedReunionId(Number(e.target.value))} 
                            className="bg-background border border-border p-2 rounded-md w-full max-w-md text-text-primary"
                        >
                            <option value="">-- Selecciona una reunión --</option>
                            {reuniones.map(r => <option key={r.id} value={r.id}>{formatDate(r.fecha)} - {r.tema}</option>)}
                        </select>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-background text-text-secondary uppercase text-[10px]">
                            <tr>
                                <th className="p-3">Nombre Completo</th>
                                <th className="p-3">Cédula</th>
                                <th className="p-3">Edad</th>
                                <th className="p-3">Ciudad / Barrio</th>
                                <th className="p-3">Teléfono</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {(reportData as Adolescente[]).map((a) => (
                                <tr key={a.id} className="hover:bg-background/40">
                                    <td className="p-3 font-bold text-text-primary">{a.nombre} {a.apellido}</td>
                                    <td className="p-3 text-text-secondary font-mono">{a.cedula}</td>
                                    <td className="p-3">{calcularEdad(a.fechaNacimiento)}</td>
                                    <td className="p-3 text-text-secondary">{a.ciudad} - {a.barrio}</td>
                                    <td className="p-3 text-text-secondary">{a.telefono}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {reportData.length === 0 && (
                        <p className="p-8 text-center text-text-secondary italic">No hay datos para mostrar en este reporte.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reportes;
