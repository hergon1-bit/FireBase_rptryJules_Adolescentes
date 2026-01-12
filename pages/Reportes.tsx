import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency, calcularEdad } from '../utils/helpers';
import { Adolescente, AsistenciaDetalle } from '../types';
import { RefreshIcon, PrinterIcon, BookOpenIcon, CalendarDaysIcon, DownloadCloudIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'cumpleanos' | 'asistenciaReunion' | 'resumenAsistencia' | 'ausencias' | 'activos' | 'tutores' | 'pagosEvento' | 'entregasDevocionales' | 'inscriptosEvento';

const Reportes: React.FC = () => {
    const { 
        adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, eventos, 
        inscripciones, pagos, devocionales, entregasDevocionales, 
        servidores, inscripcionesServidores, pagosServidores, fetchData 
    } = useData();
    const [activeReport, setActiveReport] = useState<ReportType>('cumpleanos');
    const [selectedReunionId, setSelectedReunionId] = useState<number | null>(null);
    const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Estados para filtros de balance de evento
    const [filterBecados, setFilterBecados] = useState(false);
    const [filterDeudores, setFilterDeudores] = useState(false);
    const [filterPagados, setFilterPagados] = useState(false);

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

    const getNombreMes = (mesNum: number) => {
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        return meses[mesNum - 1];
    };

    const reportData = useMemo(() => {
        const currentYear = new Date().getFullYear();

        switch (activeReport) {
            case 'inscriptosEvento':
                if (!selectedEventoId) return [];
                const event = eventos.find(e => e.id === selectedEventoId);
                const costoPersonaDefault = event?.costoPersona || 0;

                const dataChicos = inscripciones.filter(i => i.eventoId === selectedEventoId).map(i => {
                    const ado = adolescentes.find(a => a.id === i.adolescenteId);
                    const pagosAdo = pagos.filter(p => p.inscripcionId === i.id);
                    const totalPagado = pagosAdo.reduce((sum, p) => sum + p.monto, 0);
                    
                    // Saldo Campista: Costo por persona menos importe pagado
                    const saldoCalculado = costoPersonaDefault - totalPagado;

                    return {
                        tipo: 'CHICO',
                        nombre: ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido',
                        registro: ado?.registro || 'N/A',
                        rol: 'Participante',
                        pagado: totalPagado,
                        saldo: Math.max(0, saldoCalculado)
                    };
                });

                const dataServidores = inscripcionesServidores.filter(i => i.eventoId === selectedEventoId).map(i => {
                    const s = servidores.find(ser => ser.id === i.servidorId);
                    const pagosS = pagosServidores.filter(p => p.inscripcionServidorId === i.id);
                    const totalPagado = pagosS.reduce((sum, p) => sum + p.monto, 0);
                    
                    const costoPersona = costoPersonaDefault;
                    const montoAcordado = i.montoAcordado || 0;
                    let saldoCalculado = 0;

                    // Lógica solicitada para Servidores:
                    if (i.tipoBeca === 'Total') {
                        // Beca Total: saldo es 0 siempre para el servidor
                        saldoCalculado = 0;
                    } else if (i.tipoBeca === 'Parcial') {
                        // Beca Parcial: Lo que el servidor debe es su monto acordado menos lo pagado
                        saldoCalculado = Math.max(0, montoAcordado - totalPagado);
                    } else {
                        // Sin Beca: Costo estándar menos pagado
                        saldoCalculado = Math.max(0, costoPersona - totalPagado);
                    }

                    return {
                        tipo: 'APOYO',
                        nombre: s ? `${s.nombre} ${s.apellido}` : 'Desconocido',
                        registro: s?.registro || 'N/A',
                        rol: i.rol + (i.tipoBeca && i.tipoBeca !== 'Ninguna' ? ` (Beca ${i.tipoBeca})` : ''),
                        pagado: totalPagado,
                        saldo: saldoCalculado
                    };
                });

                let combinedResults = [...dataChicos, ...dataServidores];

                // Aplicar filtros si alguno está activo
                if (filterBecados || filterDeudores || filterPagados) {
                    combinedResults = combinedResults.filter(item => {
                        const isBecado = item.tipo === 'APOYO' && item.rol.includes('Beca');
                        const hasDebt = item.saldo > 0;
                        const isFullyPaid = item.saldo === 0;

                        if (filterBecados && isBecado) return true;
                        if (filterDeudores && hasDebt) return true;
                        if (filterPagados && isFullyPaid) return true;
                        return false;
                    });
                }

                return combinedResults.sort((a, b) => a.nombre.localeCompare(b.nombre));

            case 'entregasDevocionales':
                const entregasEsteAno = entregasDevocionales.filter(e => new Date(e.fechaEntrega).getFullYear() === currentYear);
                const conteoEntregas: { [key: number]: number } = {};
                entregasEsteAno.forEach(e => { conteoEntregas[e.adolescenteId] = (conteoEntregas[e.adolescenteId] || 0) + 1; });
                return Object.entries(conteoEntregas).map(([id, total]) => {
                    const ado = adolescentes.find(a => a.id === Number(id));
                    return { id: Number(id), nombre: ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido', cedula: ado?.cedula || 'N/A', totalEntregas: total };
                }).sort((a, b) => b.totalEntregas - a.totalEntregas);

            case 'cumpleanos':
                const currentMonth = new Date().getMonth() + 1; // 1-12
                const currentYearStr = new Date().getFullYear().toString();
                
                return adolescentes.filter(a => {
                    if (!a.fechaNacimiento) return false;
                    const month = parseInt(a.fechaNacimiento.split('-')[1], 10);
                    return month === currentMonth;
                }).map(a => {
                    const parts = a.fechaNacimiento.split('-');
                    const fechaCumpleActual = `${currentYearStr}-${parts[1]}-${parts[2]}`;
                    return { ...a, fechaCumpleActual };
                }).sort((a, b) => {
                    const dayA = parseInt(a.fechaNacimiento.split('-')[2], 10);
                    const dayB = parseInt(b.fechaNacimiento.split('-')[2], 10);
                    return dayA - dayB;
                });
            
            case 'asistenciaReunion':
                if (!selectedReunionId) return [];
                return asistencias
                    .filter(a => Number(a.reunionId) === Number(selectedReunionId) && a.estado === 'Presente')
                    .map(a => {
                        const ado = adolescentes.find(ado => Number(ado.id) === Number(a.adolescenteId));
                        return ado ? { ...ado, asistenciaDetalle: a.detalle } : null;
                    }).filter(Boolean) as any[];

            case 'resumenAsistencia':
                const totalActivosCount = adolescentes.filter(a => a.estado === 'Activo').length;
                return reuniones.filter(r => {
                     if (!dateRange.start && !dateRange.end) return true;
                     const d = new Date(r.fecha);
                     return d >= (dateRange.start ? new Date(dateRange.start) : new Date(0)) && d <= (dateRange.end ? new Date(dateRange.end) : new Date(3000, 0, 1));
                }).map(r => {
                    const asis = asistencias.filter(a => Number(a.reunionId) === Number(r.id));
                    const pres = asis.filter(a => a.estado === 'Presente').length;
                    const total = Math.max(asis.length, totalActivosCount);
                    return { id: r.id, fecha: r.fecha, tema: r.tema, encargadoNombre: (encargados.find(e => e.id === r.encargadoId))?.nombre || 'N/A', presentes: pres, ausentes: total - pres, porcentaje: total > 0 ? ((pres / total) * 100).toFixed(1) : '0' };
                }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            case 'activos': return adolescentes.filter(a => a.estado === 'Activo').sort((a,b) => a.nombre.localeCompare(b.nombre));
            default: return [];
        }
    }, [activeReport, adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, eventos, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores, devocionales, entregasDevocionales, selectedReunionId, selectedEventoId, dateRange, filterBecados, filterDeudores, filterPagados]);

    const generarPDFBalanceEvento = () => {
        if (!selectedEventoId) return;
        const ev = eventos.find(e => e.id === selectedEventoId);
        if (!ev) return;
        const doc = new jsPDF({ orientation: 'landscape' });
        const data = reportData as any[];
        
        const ahora = new Date();
        const fechaHoraImp = `${ahora.toLocaleDateString('es-PY')} ${ahora.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`;
        
        const costoPersona = ev.costoPersona || 0;
        const totalPagado = data.reduce((acc, r) => acc + r.pagado, 0);
        const totalEsperado = data.length * costoPersona;

        autoTable(doc, {
            startY: 50,
            margin: { top: 50 },
            head: [['Tipo', 'Nombre y Apellido', 'Registro / CI', 'Rol / Función', 'Pagado', 'Saldo']],
            body: data.map(row => [row.tipo, row.nombre, row.registro, row.rol, formatCurrency(row.pagado), formatCurrency(row.saldo)]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            didDrawPage: (d) => {
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text(`Balance de Evento: ${ev.tema}`, 15, 15);
                
                doc.setFontSize(10);
                doc.text(`Fecha/Hora: ${fechaHoraImp}`, 235, 15);
                doc.text(`Página ${d.pageNumber}`, 235, 20);
                
                doc.setFontSize(10);
                doc.text(`Fecha Evento: ${formatDate(ev.fechaInicio)} | Costo p/ Persona: ${formatCurrency(costoPersona)}`, 15, 25);
                doc.text(`Inscriptos Totales: ${data.length}`, 15, 30);
                
                doc.setFont(undefined, 'bold');
                doc.text(`Monto Esperado a Recaudar: ${formatCurrency(totalEsperado)}`, 15, 38);
                doc.setTextColor(16, 185, 129);
                doc.text(`Total Cobrado a la Fecha: ${formatCurrency(totalPagado)}`, 140, 38);
                doc.setTextColor(40);
                doc.setFont(undefined, 'normal');
                
                doc.line(15, 42, 280, 42);
            }
        });
        
        doc.save(`Balance_${ev.tema}.pdf`);
    };

    const generarPDFListaAsistencia = () => {
        if (!selectedReunionId) return;
        const reu = reuniones.find(r => r.id === selectedReunionId);
        if (!reu) return;
        const enc = encargados.find(e => e.id === reu.encargadoId);

        const doc = new jsPDF({ orientation: 'landscape' });
        const totalPagesExp = '{total_pages_count_string}';
        const ahora = new Date();
        const fechaHoraImp = `${ahora.toLocaleDateString('es-PY')} ${ahora.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`;
        const data = reportData as any[];

        autoTable(doc, {
            startY: 40,
            margin: { top: 40 },
            head: [['Nombre y Apellido', 'Registro Salud', 'Edad', 'Fecha Cumple', 'Dirección', 'Ciudad', 'Teléfono']],
            body: data.map(a => [
                `${a.nombre} ${a.apellido}`,
                a.registro || 'N/A',
                `${calcularEdad(a.fechaNacimiento)}`,
                formatDate(a.fechaNacimiento),
                a.barrio || 'N/A',
                a.ciudad || 'N/A',
                a.telefono || 'N/A'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            didDrawPage: (pageData) => {
                // Cabecera repetitiva
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text('Lista Asistencia', 15, 15);
                
                doc.setFontSize(10);
                doc.text(`Reunión: ${reu.tema}`, 15, 23);
                doc.text(`Fecha Reunión: ${formatDate(reu.fecha)} | Encargado: ${enc?.nombre} ${enc?.apellido} | Asistentes: ${data.length}`, 15, 28);
                
                // Fecha y Pagina
                doc.setFontSize(9);
                doc.text(`Fecha/Hora Impresión: ${fechaHoraImp}`, 230, 15);
                let str = "Página " + doc.internal.getNumberOfPages();
                if (typeof doc.putTotalPages === 'function') {
                    str = str + " / " + totalPagesExp;
                }
                doc.text(str, 230, 20);
                
                doc.line(15, 33, 280, 33);
            }
        });

        if (typeof doc.putTotalPages === 'function') {
            doc.putTotalPages(totalPagesExp);
        }
        
        doc.save(`Asistencia_${reu.tema}_${reu.fecha}.pdf`);
    };

    const generarPDFCumpleanos = () => {
        const doc = new jsPDF();
        const mesActual = new Date().getMonth() + 1;
        const nombreMes = getNombreMes(mesActual);
        const ahora = new Date();
        const fechaHoraImp = `${ahora.toLocaleDateString('es-PY')} ${ahora.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}`;
        const data = reportData as any[];

        autoTable(doc, {
            startY: 35,
            margin: { top: 35 },
            head: [['Fecha Cumpleaños', 'Nombre y Apellido', 'Registro de Salud', 'Edad Actual']],
            body: data.map(r => [formatDate(r.fechaCumpleActual), `${r.nombre} ${r.apellido}`, r.registro || 'N/A', `${calcularEdad(r.fechaNacimiento)} años`]),
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }, 
            didDrawPage: (d) => {
                doc.setFontSize(16);
                doc.setTextColor(40);
                doc.text(`Cumpleaños del mes: ${nombreMes}`, 15, 15);
                
                doc.setFontSize(10);
                doc.text(`Fecha/Hora: ${fechaHoraImp}`, 150, 15);
                doc.text(`Página ${d.pageNumber}`, 150, 20);
                doc.line(15, 25, 195, 25);
            }
        });
        doc.save(`Cumpleaños_${nombreMes}.pdf`);
    };

    const tableHeaders = useMemo(() => {
        switch (activeReport) {
            case 'inscriptosEvento': return ['Tipo', 'Nombre', 'Reg / CI', 'Función', 'Pagado', 'Saldo'];
            case 'cumpleanos': return ['Fecha Cumpleaños', 'Nombre y Apellido', 'Reg. Salud', 'Edad Actual'];
            case 'activos': return ['Nombre y Apellido', 'Cédula', 'Teléfono', 'Ciudad'];
            case 'entregasDevocionales': return ['Posición', 'Nombre y Apellido', 'Cédula', 'Total Entregas'];
            case 'asistenciaReunion': return ['Nombre y Apellido', 'Reg. Salud', 'Edad', 'Fecha Cumple'];
            case 'resumenAsistencia': return ['Fecha', 'Tema', 'Encargado', 'Pres.', 'Aus.', '%'];
            default: return ['Dato'];
        }
    }, [activeReport]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reportes</h1>
                <button onClick={handleRefresh} className="p-2 text-text-secondary hover:text-primary transition-colors">
                    <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <TabButton name="Balance Eventos" id="inscriptosEvento" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Cumpleaños del Mes" id="cumpleanos" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Resumen Asistencia" id="resumenAsistencia" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Lista Asistentes" id="asistenciaReunion" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Adolescentes Activos" id="activos" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Ranking Tareas" id="entregasDevocionales" active={activeReport} setActive={setActiveReport} />
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                {activeReport === 'inscriptosEvento' && (
                    <div className="space-y-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <select value={selectedEventoId || ''} onChange={e => { setSelectedEventoId(Number(e.target.value)); }} className="bg-background border border-border p-2 rounded-md flex-1 text-text-primary">
                                <option value="">-- Elija un evento --</option>
                                {eventos.map(e => <option key={e.id} value={e.id}>{e.tema} ({formatDate(e.fechaInicio)})</option>)}
                            </select>
                            <button onClick={generarPDFBalanceEvento} disabled={!selectedEventoId} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2 font-bold transition">
                                <PrinterIcon className="w-5 h-5" /> Imprimir Balance PDF
                            </button>
                        </div>
                        
                        {selectedEventoId && (
                            <div className="flex flex-wrap gap-4 p-3 bg-background/50 rounded-lg border border-border/50">
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest w-full mb-1">Filtrar vista actual:</span>
                                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer hover:text-text-primary transition-colors select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={filterBecados} 
                                        onChange={(e) => setFilterBecados(e.target.checked)}
                                        className="h-4 w-4 text-primary rounded border-border bg-background focus:ring-primary"
                                    />
                                    <span>Ver Becados</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer hover:text-text-primary transition-colors select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={filterDeudores} 
                                        onChange={(e) => setFilterDeudores(e.target.checked)}
                                        className="h-4 w-4 text-primary rounded border-border bg-background focus:ring-primary"
                                    />
                                    <span>Saldo Pendiente</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer hover:text-text-primary transition-colors select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={filterPagados} 
                                        onChange={(e) => setFilterPagados(e.target.checked)}
                                        className="h-4 w-4 text-primary rounded border-border bg-background focus:ring-primary"
                                    />
                                    <span>Totalmente Pagados</span>
                                </label>
                            </div>
                        )}
                    </div>
                )}

                {activeReport === 'cumpleanos' && reportData.length > 0 && (
                    <div className="flex justify-end mb-6">
                        <button onClick={generarPDFCumpleanos} className="bg-secondary hover:bg-emerald-600 text-white px-4 py-2 rounded-md flex items-center gap-2 font-bold transition shadow-lg">
                            <PrinterIcon className="w-5 h-5" /> Imprimir PDF Cumpleaños
                        </button>
                    </div>
                )}

                {activeReport === 'asistenciaReunion' && (
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <select value={selectedReunionId || ''} onChange={e => setSelectedReunionId(Number(e.target.value))} className="bg-background border border-border p-2 rounded-md flex-1 text-text-primary">
                            <option value="">-- Elija una reunión finalizada --</option>
                            {reuniones.filter(r => r.estado === 'Finalizado').map(r => <option key={r.id} value={r.id}>{formatDate(r.fecha)} - {r.tema}</option>)}
                        </select>
                        <button onClick={generarPDFListaAsistencia} disabled={!selectedReunionId} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md disabled:opacity-50 flex items-center gap-2 font-bold transition shadow-lg">
                            <PrinterIcon className="w-5 h-5" /> Imprimir Lista PDF
                        </button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-background text-text-secondary">
                            <tr>
                                {tableHeaders.map(h => <th key={h} className="p-3">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {reportData.length > 0 ? (
                                reportData.map((r: any, i) => {
                                    if (activeReport === 'inscriptosEvento') {
                                        return (
                                            <tr key={i} className="hover:bg-background/40">
                                                <td className={`p-3 font-bold text-[10px] ${r.tipo === 'CHICO' ? 'text-primary' : 'text-secondary'}`}>{r.tipo}</td>
                                                <td className="p-3 font-medium">{r.nombre}</td>
                                                <td className="p-3 font-mono text-xs">{r.registro}</td>
                                                <td className="p-3 italic text-xs">{r.rol}</td>
                                                <td className="p-3 font-bold text-green-400">{formatCurrency(r.pagado)}</td>
                                                <td className={`p-3 font-bold ${r.saldo > 0 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(r.saldo)}</td>
                                            </tr>
                                        );
                                    } else if (activeReport === 'cumpleanos') {
                                        return (
                                            <tr key={r.id} className="hover:bg-background/40">
                                                <td className="p-3 font-bold text-primary">{formatDate(r.fechaCumpleActual)}</td>
                                                <td className="p-3 font-medium">{r.nombre} {r.apellido}</td>
                                                <td className="p-3 font-mono text-xs">{r.registro || 'N/A'}</td>
                                                <td className="p-3">{calcularEdad(r.fechaNacimiento)} años</td>
                                            </tr>
                                        );
                                    } else if (activeReport === 'activos') {
                                        return (
                                            <tr key={r.id} className="hover:bg-background/40">
                                                <td className="p-3 font-medium">{r.nombre} {r.apellido}</td>
                                                <td className="p-3 font-mono text-xs">{r.cedula}</td>
                                                <td className="p-3">{r.telefono}</td>
                                                <td className="p-3">{r.ciudad}</td>
                                            </tr>
                                        );
                                    } else if (activeReport === 'entregasDevocionales') {
                                        return (
                                            <tr key={r.id} className="hover:bg-background/40">
                                                <td className="p-3 font-bold text-secondary">{i + 1}º</td>
                                                <td className="p-3 font-medium">{r.nombre}</td>
                                                <td className="p-3 font-mono text-xs">{r.cedula}</td>
                                                <td className="p-3 font-black text-primary">{r.totalEntregas}</td>
                                            </tr>
                                        );
                                    } else if (activeReport === 'resumenAsistencia') {
                                        return (
                                            <tr key={r.id} className="hover:bg-background/40">
                                                <td className="p-3 text-xs">{formatDate(r.fecha)}</td>
                                                <td className="p-3 font-bold">{r.tema}</td>
                                                <td className="p-3 text-xs">{r.encargadoNombre}</td>
                                                <td className="p-3 text-green-400 font-bold">{r.presentes}</td>
                                                <td className="p-3 text-red-400 font-bold">{r.ausentes}</td>
                                                <td className="p-3 font-mono font-bold bg-primary/10 text-center">{r.porcentaje}%</td>
                                            </tr>
                                        );
                                    } else if (activeReport === 'asistenciaReunion') {
                                        return (
                                            <tr key={r.id} className="hover:bg-background/40">
                                                <td className="p-3 font-medium">{r.nombre} {r.apellido}</td>
                                                <td className="p-3 font-mono text-[10px] text-text-secondary">{r.registro || 'S/REG'}</td>
                                                <td className="p-3 font-bold">{calcularEdad(r.fechaNacimiento)}</td>
                                                <td className="p-3 text-xs">{formatDate(r.fechaNacimiento)}</td>
                                            </tr>
                                        );
                                    }
                                    return <tr key={i}><td className="p-3">Datos no renderizables para este formato.</td></tr>;
                                })
                            ) : (
                                <tr><td colSpan={tableHeaders.length} className="p-12 text-center text-text-secondary italic">No se encontraron datos para los filtros seleccionados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{name: string, id: ReportType, active: ReportType, setActive: (id: ReportType) => void}> = ({name, id, active, setActive}) => (
    <button onClick={() => setActive(id)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${active === id ? 'bg-primary text-white' : 'bg-background text-text-secondary hover:bg-gray-700'}`}>{name}</button>
);

export default Reportes;