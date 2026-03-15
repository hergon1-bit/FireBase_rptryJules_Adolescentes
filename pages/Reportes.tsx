
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, calcularEdad } from '../utils/helpers';
import { Adolescente } from '../types';
import { RefreshIcon, PrinterIcon, UsersIcon, CalendarDaysIcon, ClipboardListIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'cumpleanos' | 'asistenciaReunion' | 'ausencias' | 'activos' | 'adolescentesTutores' | 'tutores';

const Reportes: React.FC = () => {
    const { 
        adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, fetchData 
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

    const getBirthdayThisYear = (birthDate: string) => {
        if (!birthDate) return 'N/A';
        // Asumimos formato ISO o similar de la DB
        const parts = birthDate.split('T')[0].split('-');
        if (parts.length !== 3) return 'N/A';
        const day = parts[2];
        const month = parts[1];
        const year = new Date().getFullYear();
        return `${day}/${month}/${year}`;
    };

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
                    .filter(a => Number(a.reunionId) === Number(selectedReunionId) && a.estado === 'Presente')
                    .map(a => adolescentes.find(ado => ado.id === a.adolescenteId))
                    .filter(Boolean) as Adolescente[];

            case 'adolescentesTutores':
                return adolescentes.map(ado => {
                    const adoTutoresIds = tutoresAdolescentes.filter(ta => ta.adolescenteId === ado.id).map(ta => ta.tutorId);
                    const adoTutores = tutores.filter(t => adoTutoresIds.includes(t.id));
                    return { ...ado, tutores: adoTutores };
                }).sort((a, b) => a.nombre.localeCompare(b.nombre));

            case 'tutores':
                return tutores.sort((a, b) => a.nombre.localeCompare(b.nombre));

            default: return [];
        }
    }, [activeReport, adolescentes, reuniones, asistencias, selectedReunionId, tutores, tutoresAdolescentes]);

    const handlePrint = () => {
        const doc = new jsPDF();
        const title = activeReport === 'cumpleanos' ? 'CUMPLEAÑOS DEL MES' :
                      activeReport === 'asistenciaReunion' ? 'ASISTENCIA POR REUNIÓN' :
                      activeReport === 'ausencias' ? 'ALERTA DE AUSENCIAS' : 
                      activeReport === 'adolescentesTutores' ? 'ADOLESCENTES Y SUS TUTORES' :
                      activeReport === 'tutores' ? 'LISTADO DE TUTORES' : 'LISTA DE ACTIVOS';
        
        doc.setFontSize(16);
        doc.text(`Reporte de Seguimiento: ${title}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 22);

        if (activeReport === 'asistenciaReunion' && selectedReunionId) {
            const reu = reuniones.find(r => r.id === selectedReunionId);
            if (reu) {
                doc.text(`Reunión: ${reu.tema} - Fecha: ${formatDate(reu.fecha)}`, 14, 28);
                const enc = encargados.find(e => e.id === reu.encargadoId);
                if (enc) {
                    doc.text(`Encargado: ${enc.nombre} ${enc.apellido}`, 14, 34);
                }
            }
        }

        const headers = activeReport === 'cumpleanos' 
            ? [['Nombre', 'Fecha Cumpleaños', 'Reg. Salud', 'Edad', 'Barrio', 'Teléfono']]
            : activeReport === 'adolescentesTutores'
            ? [['Adolescente', 'Cédula', 'Tutores (Nombre y Teléfono)']]
            : activeReport === 'tutores'
            ? [['Nombre', 'Cédula', 'Teléfono', 'Parentesco', 'Barrio', 'Ciudad']]
            : (activeReport === 'activos' || activeReport === 'asistenciaReunion')
            ? [['Nombre', 'Reg. Salud', 'Edad', 'Barrio', 'Teléfono']]
            : [['Nombre', 'Cédula CI', 'Reg. Salud', 'Edad', 'Barrio', 'Teléfono']];

        const tableData = reportData.map((item: any) => {
            if (activeReport === 'adolescentesTutores') {
                const tutoresStr = item.tutores.map((t: any) => `${t.nombre} ${t.apellido} (${t.telefono || 'Sin tel'})`).join('\n');
                return [`${item.nombre} ${item.apellido}`, item.cedula, tutoresStr || 'Sin tutores'];
            }
            if (activeReport === 'tutores') {
                return [`${item.nombre} ${item.apellido}`, item.cedula, item.telefono || '-', item.parentesco || '-', item.barrio || '-', item.ciudad || '-'];
            }

            const a = item as Adolescente;
            const row = [`${a.nombre} ${a.apellido}`];
            if (activeReport === 'cumpleanos') {
                row.push(getBirthdayThisYear(a.fechaNacimiento));
            } else if (activeReport !== 'activos' && activeReport !== 'asistenciaReunion') {
                row.push(a.cedula);
            }
            row.push(
                a.registro || 'N/A',
                calcularEdad(a.fechaNacimiento).toString(),
                a.barrio || 'N/A',
                a.telefono || 'N/A'
            );
            return row;
        });

        autoTable(doc, {
            startY: activeReport === 'asistenciaReunion' ? 40 : 28,
            head: headers,
            body: tableData,
            headStyles: { fillColor: [79, 70, 229] },
        });

        doc.save(`reporte_${activeReport}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reportes de Seguimiento</h1>
                <div className="flex gap-2">
                    <button 
                        onClick={handlePrint} 
                        className="bg-surface border border-border p-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                        title="Imprimir PDF"
                    >
                        <PrinterIcon className="w-5 h-5" />
                    </button>
                    <button onClick={handleRefresh} className="p-2 text-text-secondary hover:text-primary transition-colors">
                        <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setActiveReport('cumpleanos')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'cumpleanos' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <CalendarDaysIcon className="w-4 h-4" /> Cumpleaños del Mes
                </button>
                <button onClick={() => setActiveReport('ausencias')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'ausencias' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Alerta de Ausencias
                </button>
                <button onClick={() => setActiveReport('activos')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'activos' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Lista de Activos
                </button>
                <button onClick={() => setActiveReport('asistenciaReunion')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'asistenciaReunion' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <ClipboardListIcon className="w-4 h-4" /> Asistencia por Reunión
                </button>
                <button onClick={() => setActiveReport('adolescentesTutores')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'adolescentesTutores' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Adolescentes y Tutores
                </button>
                <button onClick={() => setActiveReport('tutores')} className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeReport === 'tutores' ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-text-secondary hover:bg-background'}`}>
                    <UsersIcon className="w-4 h-4" /> Listado de Tutores
                </button>
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg border border-border">
                {activeReport === 'asistenciaReunion' && (
                    <div className="mb-6 bg-background/50 p-4 rounded-lg border border-border/50">
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">Seleccionar Reunión</label>
                        <select 
                            value={selectedReunionId || ''} 
                            onChange={e => setSelectedReunionId(Number(e.target.value))} 
                            className="bg-background border border-border p-2.5 rounded-md w-full max-w-md text-text-primary focus:ring-2 ring-primary outline-none"
                        >
                            <option value="">-- Selecciona una reunión --</option>
                            {reuniones.map(r => <option key={r.id} value={r.id}>{formatDate(r.fecha)} - {r.tema}</option>)}
                        </select>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-background text-text-secondary uppercase text-[10px] font-black tracking-widest">
                            <tr>
                                {activeReport === 'adolescentesTutores' ? (
                                    <>
                                        <th className="p-4">Adolescente</th>
                                        <th className="p-4">Cédula</th>
                                        <th className="p-4">Tutores (Nombre y Teléfono)</th>
                                    </>
                                ) : activeReport === 'tutores' ? (
                                    <>
                                        <th className="p-4">Nombre Completo</th>
                                        <th className="p-4">Cédula</th>
                                        <th className="p-4">Teléfono</th>
                                        <th className="p-4">Parentesco</th>
                                        <th className="p-4">Barrio</th>
                                        <th className="p-4">Ciudad</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="p-4">Nombre Completo</th>
                                        {activeReport !== 'activos' && activeReport !== 'asistenciaReunion' && (
                                            <th className="p-4">{activeReport === 'cumpleanos' ? 'Fecha Cumpleaños' : 'Cédula CI'}</th>
                                        )}
                                        <th className="p-4">Reg. Salud</th>
                                        <th className="p-4">Edad</th>
                                        <th className="p-4">Ciudad / Barrio</th>
                                        <th className="p-4">Teléfono</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {reportData.map((item: any) => {
                                if (activeReport === 'adolescentesTutores') {
                                    return (
                                        <tr key={item.id} className="hover:bg-background/40 transition-colors group">
                                            <td className="p-4 font-bold text-text-primary group-hover:text-primary">{item.nombre} {item.apellido}</td>
                                            <td className="p-4 text-text-secondary font-mono font-bold">{item.cedula}</td>
                                            <td className="p-4 text-text-secondary text-xs">
                                                {item.tutores.length > 0 ? (
                                                    <div className="flex flex-col gap-1">
                                                        {item.tutores.map((t: any) => (
                                                            <span key={t.id}>{t.nombre} {t.apellido} {t.telefono ? `(${t.telefono})` : ''}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="italic">Sin tutores</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                }
                                if (activeReport === 'tutores') {
                                    return (
                                        <tr key={item.id} className="hover:bg-background/40 transition-colors group">
                                            <td className="p-4 font-bold text-text-primary group-hover:text-primary">{item.nombre} {item.apellido}</td>
                                            <td className="p-4 text-text-secondary font-mono font-bold">{item.cedula}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.telefono || '-'}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.parentesco || '-'}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.barrio || '-'}</td>
                                            <td className="p-4 text-text-secondary text-xs">{item.ciudad || '-'}</td>
                                        </tr>
                                    );
                                }

                                const a = item as Adolescente;
                                return (
                                <tr key={a.id} className="hover:bg-background/40 transition-colors group">
                                    <td className="p-4 font-bold text-text-primary group-hover:text-primary">{a.nombre} {a.apellido}</td>
                                    {activeReport !== 'activos' && activeReport !== 'asistenciaReunion' && (
                                        <td className="p-4 text-text-secondary font-mono font-bold">
                                            {activeReport === 'cumpleanos' ? getBirthdayThisYear(a.fechaNacimiento) : a.cedula}
                                        </td>
                                    )}
                                    <td className="p-4 text-text-secondary text-xs">{a.registro || '-'}</td>
                                    <td className="p-4 font-medium">{calcularEdad(a.fechaNacimiento)} años</td>
                                    <td className="p-4 text-text-secondary text-xs">{a.ciudad} {a.barrio ? `/ ${a.barrio}` : ''}</td>
                                    <td className="p-4 text-text-secondary text-xs">{a.telefono || '-'}</td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                    {reportData.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="bg-background/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                                <ClipboardListIcon className="w-8 h-8 text-border" />
                            </div>
                            <p className="text-text-secondary italic">No hay datos disponibles para los criterios seleccionados.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reportes;
