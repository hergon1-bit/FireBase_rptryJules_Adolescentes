
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency } from '../utils/helpers';
import { Adolescente, AsistenciaDetalle } from '../types';
import { RefreshIcon, PrinterIcon, BookOpenIcon, CalendarDaysIcon, DownloadCloudIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportType = 'cumpleanos' | 'asistenciaReunion' | 'resumenAsistencia' | 'ausencias' | 'activos' | 'tutores' | 'pagosEvento' | 'entregasDevocionales' | 'inscriptosEvento';

const Reportes: React.FC = () => {
    const { adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, eventos, inscripciones, pagos, devocionales, entregasDevocionales, fetchData } = useData();
    const [activeReport, setActiveReport] = useState<ReportType>('cumpleanos');
    const [selectedReunionId, setSelectedReunionId] = useState<number | null>(null);
    const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
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
        const currentYear = new Date().getFullYear();

        switch (activeReport) {
            case 'inscriptosEvento':
                // Filtramos inscripciones por evento seleccionado o mostramos todas
                const filteredInscripciones = selectedEventoId 
                    ? inscripciones.filter(i => i.eventoId === Number(selectedEventoId))
                    : inscripciones;

                return filteredInscripciones.map(i => {
                    const event = eventos.find(e => e.id === i.eventoId);
                    const ado = adolescentes.find(a => a.id === i.adolescenteId);
                    const pagosAdo = pagos.filter(p => p.inscripcionId === i.id);
                    const montoPagado = pagosAdo.reduce((sum, p) => sum + p.monto, 0);
                    const costoPersona = event?.costoPersona || 0;
                    const saldo = costoPersona - montoPagado;

                    return {
                        id: i.id,
                        eventoNombre: event?.tema || 'Desconocido',
                        adolescenteNombre: ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido',
                        adolescenteRegistro: ado?.registro || 'N/A', // Usamos registro en lugar de cédula
                        costo: costoPersona,
                        pagado: montoPagado,
                        saldo: saldo > 0 ? saldo : 0,
                        tieneCosto: event?.tieneCosto || false
                    };
                }).sort((a, b) => {
                    // Orden primario por nombre del evento
                    const eventCompare = a.eventoNombre.localeCompare(b.eventoNombre);
                    if (eventCompare !== 0) return eventCompare;
                    // Orden secundario por nombre del adolescente
                    return a.adolescenteNombre.localeCompare(b.adolescenteNombre);
                });

            case 'entregasDevocionales':
                const entregasEsteAno = entregasDevocionales.filter(e => 
                    new Date(e.fechaEntrega).getFullYear() === currentYear
                );

                const conteoEntregas: { [key: number]: number } = {};
                entregasEsteAno.forEach(e => {
                    conteoEntregas[e.adolescenteId] = (conteoEntregas[e.adolescenteId] || 0) + 1;
                });

                return Object.entries(conteoEntregas)
                    .map(([id, total]) => {
                        const ado = adolescentes.find(a => a.id === Number(id));
                        return {
                            id: Number(id),
                            nombre: ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido',
                            cedula: ado?.cedula || 'N/A',
                            totalEntregas: total
                        };
                    })
                    .sort((a, b) => b.totalEntregas - a.totalEntregas);

            case 'cumpleanos':
                const currentMonth = new Date().getMonth();
                return adolescentes.filter(a => new Date(a.fechaNacimiento).getMonth() === currentMonth);
            
            case 'asistenciaReunion':
                if (!selectedReunionId) return [];
                const asistentesData = asistencias
                    .filter(a => Number(a.reunionId) === Number(selectedReunionId) && a.estado === 'Presente')
                    .map(a => {
                        const adolescente = adolescentes.find(ado => ado.id === a.adolescenteId);
                        return adolescente ? { ...adolescente, asistenciaDetalle: a.detalle } : null;
                    })
                    .filter(Boolean);
                return asistentesData as (Adolescente & { asistenciaDetalle?: AsistenciaDetalle })[];

            case 'resumenAsistencia':
                const totalAdolescentesActivos = adolescentes.filter(a => a.estado === 'Activo').length;
                const filteredReuniones = reuniones.filter(r => {
                     if (!dateRange.start && !dateRange.end) return true;
                     const reunionDate = new Date(r.fecha);
                     const start = dateRange.start ? new Date(dateRange.start) : new Date('1900-01-01');
                     const end = dateRange.end ? new Date(dateRange.end) : new Date('2100-01-01');
                     return reunionDate >= start && reunionDate <= end;
                });

                return filteredReuniones.map(r => {
                    const asisPorReunion = asistencias.filter(a => Number(a.reunionId) === Number(r.id));
                    const presentes = asisPorReunion.filter(a => a.estado === 'Presente').length;
                    const totalBase = Math.max(asisPorReunion.length, totalAdolescentesActivos);
                    const ausentes = totalBase - presentes;
                    const porcentaje = totalBase > 0 ? ((presentes / totalBase) * 100).toFixed(1) : '0.0';
                    const encargado = encargados.find(e => e.id === r.encargadoId);
                    return {
                        id: r.id, fecha: r.fecha, tema: r.tema,
                        encargadoNombre: encargado ? `${encargado.nombre} ${encargado.apellido}` : 'N/A',
                        presentes, ausentes, totalRegistrados: totalBase, porcentaje
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
                return adolescentes.filter(a => a.estado === 'Activo').sort((a,b) => a.nombre.localeCompare(b.nombre));
            
            case 'tutores':
                 return adolescentes.map(ado => ({
                    ...ado,
                    tutores: tutoresAdolescentes
                        .filter(ta => ta.adolescenteId === ado.id)
                        .map(ta => tutores.find(t => t.id === ta.tutorId))
                        .filter(Boolean)
                }));
            
            case 'pagosEvento':
                if (!selectedEventoId) return [];
                const inscripcionesEvento = inscripciones.filter(i => i.eventoId === Number(selectedEventoId));
                const inscripcionIds = inscripcionesEvento.map(i => i.id);
                const pagosEvento = pagos.filter(p => inscripcionIds.includes(p.inscripcionId));
                return pagosEvento.map(p => {
                    const inscripcion = inscripcionesEvento.find(i => i.id === p.inscripcionId);
                    const adolescente = adolescentes.find(a => a.id === inscripcion?.adolescenteId);
                    return {
                        id: p.id, fecha: p.fecha, monto: p.monto,
                        adolescenteNombre: adolescente ? `${adolescente.nombre} ${adolescente.apellido}` : 'Desconocido',
                        adolescenteCedula: adolescente?.cedula || 'N/A'
                    };
                }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            default:
                return [];
        }
    }, [activeReport, adolescentes, reuniones, asistencias, encargados, tutores, tutoresAdolescentes, eventos, inscripciones, pagos, devocionales, entregasDevocionales, selectedReunionId, selectedEventoId, dateRange]);

    const generarExcelBalanceEvento = () => {
        if (!selectedEventoId) return;
        const evento = eventos.find(e => e.id === selectedEventoId);
        if (!evento) return;

        const data = reportData as any[];
        
        // Crear contenido CSV similar al formato del PDF
        const csvRows = [
            ['Balances y Deudas de Inscriptos'],
            [`Evento:;${evento.tema}`],
            [`Fecha:;${formatDate(evento.fechaInicio)} - ${formatDate(evento.fechaFin)}`],
            [`Costo por Persona:;${evento.tieneCosto ? formatCurrency(evento.costoPersona || 0) : 'Gratis'}`],
            [`Total Inscriptos:;${data.length}`],
            [`Impreso el:;${new Date().toLocaleString()}`],
            [''], // Espaciador
            ['Evento', 'Adolescente', 'Reg. Salud', 'Monto Pagado', 'Saldo Pendiente']
        ];

        data.forEach(row => {
            csvRows.push([
                row.eventoNombre,
                row.adolescenteNombre,
                row.adolescenteRegistro,
                formatCurrency(row.pagado).replace(/\./g, ''), // Limpiar formato para Excel si es necesario o dejar como string
                formatCurrency(row.saldo).replace(/\./g, '')
            ]);
        });

        const csvContent = csvRows.map(row => row.join(';')).join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Balance_Evento_${evento.tema.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const generarPDFBalanceEvento = () => {
        if (!selectedEventoId) return;
        const evento = eventos.find(e => e.id === selectedEventoId);
        if (!evento) return;

        const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
        const data = reportData as any[];
        const now = new Date().toLocaleString();
        
        const totalPagesExp = '{total_pages_count_string}';

        autoTable(doc, {
            startY: 58,
            head: [['Evento', 'Adolescente', 'Reg. Salud', 'Monto Pagado', 'Saldo Pendiente']],
            body: data.map(row => [
                row.eventoNombre,
                row.adolescenteNombre,
                row.adolescenteRegistro,
                formatCurrency(row.pagado),
                formatCurrency(row.saldo)
            ]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], halign: 'center' },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 45, halign: 'right' },
                4: { cellWidth: 45, halign: 'right' }
            },
            styles: { fontSize: 9 },
            didDrawPage: (dataArg) => {
                const pageSize = doc.internal.pageSize;
                const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
                
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(100);
                doc.text(`Impreso el: ${now}`, dataArg.settings.margin.left, 10);
                
                const pageNumber = `Página ${doc.internal.getNumberOfPages()} / ${totalPagesExp}`;
                doc.text(pageNumber, pageWidth - dataArg.settings.margin.right, 10, { align: 'right' });

                doc.setFontSize(18);
                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                doc.text("Balances y Deudas de Inscriptos", pageWidth / 2, 20, { align: 'center' });

                doc.setFontSize(11);
                doc.text(`Evento: ${evento.tema}`, dataArg.settings.margin.left, 30);
                doc.setFont("helvetica", "normal");
                doc.text(`Fecha: ${formatDate(evento.fechaInicio)} - ${formatDate(evento.fechaFin)}`, dataArg.settings.margin.left, 37);
                doc.text(`Costo por Persona: ${evento.tieneCosto ? formatCurrency(evento.costoPersona || 0) : 'Gratis'}`, dataArg.settings.margin.left, 44);
                doc.text(`Total Inscriptos: ${data.length}`, dataArg.settings.margin.left, 51);
                
                doc.setDrawColor(200, 200, 200);
                doc.line(dataArg.settings.margin.left, 53, pageWidth - dataArg.settings.margin.right, 53);
            },
            margin: { top: 58, left: 15, right: 15 }
        });

        if (typeof (doc as any).putTotalPages === 'function') {
            (doc as any).putTotalPages(totalPagesExp);
        }

        doc.save(`Balance_Evento_${evento.tema.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const generarPDFAsistencia = () => {
        if (!selectedReunionId) return;
        const reunion = reuniones.find(r => r.id === selectedReunionId);
        if (!reunion) return;
        const encargado = encargados.find(e => e.id === reunion.encargadoId);
        const encargadoNombre = encargado ? `${encargado.nombre} ${encargado.apellido}` : 'No asignado';
        const data = reportData as (Adolescente & { asistenciaDetalle?: AsistenciaDetalle })[];
        
        const doc = new jsPDF();
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("LISTA DE ASISTENTES", 105, 15, { align: "center" });
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`Generado el: ${new Date().toLocaleString()}`, 200, 15, { align: "right" });
        
        doc.setDrawColor(200, 200, 200);
        doc.line(15, 20, 195, 20); 

        doc.setFontSize(10);
        
        doc.setFont("helvetica", "bold");
        doc.text("Nro. Reunión:", 15, 30);
        doc.setFont("helvetica", "normal");
        doc.text(String(reunion.id), 45, 30);
        
        doc.setFont("helvetica", "bold");
        doc.text("Fecha:", 110, 30);
        doc.setFont("helvetica", "normal");
        doc.text(formatDate(reunion.fecha), 135, 30);
        
        doc.setFont("helvetica", "bold");
        doc.text("Tema:", 15, 38);
        doc.setFont("helvetica", "normal");
        doc.text(reunion.tema, 45, 38);
        
        doc.setFont("helvetica", "bold");
        doc.text("Encargado:", 15, 46);
        doc.setFont("helvetica", "normal");
        doc.text(encargadoNombre, 45, 46);
        
        doc.setFont("helvetica", "bold");
        doc.text("Participantes:", 15, 54);
        doc.setFont("helvetica", "normal");
        doc.text(`${data.length} personas presentes`, 45, 54);

        doc.line(15, 60, 195, 60); 

        autoTable(doc, {
            startY: 65,
            head: [['Nombre', 'Apellido', 'Cédula', 'Tipo de Asistencia']],
            body: data.map(ado => [
                ado.nombre, 
                ado.apellido, 
                ado.cedula, 
                ado.asistenciaDetalle || 'Regular'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], halign: 'center' },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 45 },
                2: { cellWidth: 40, halign: 'center' },
                3: { cellWidth: 45, halign: 'center' }
            },
            styles: { fontSize: 9 },
            margin: { left: 15, right: 15 } 
        });
        
        doc.save(`Asistentes_Reunion_${reunion.id}_${reunion.fecha}.pdf`);
    };

    const generarPDFActivos = () => {
        const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
        const data = reportData as Adolescente[];
        
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const dateStr = `Fecha: ${day}/${month}/${year}`;

        autoTable(doc, {
            startY: 25,
            head: [['Ord', 'Nombres y Apellidos', 'Cédula', 'Ciudad', 'Teléfono', 'Fecha Nac.', 'Participo ____/___/__']],
            body: data.map((a, index) => {
                let fechaNacFmt = '';
                if (a.fechaNacimiento) {
                    const parts = a.fechaNacimiento.split('T')[0].split('-');
                    if (parts.length === 3) {
                        fechaNacFmt = `${parts[2]}/${parts[1]}/${parts[0]}`; 
                    } else {
                        fechaNacFmt = a.fechaNacimiento;
                    }
                }

                return [
                    index + 1,
                    `${a.nombre} ${a.apellido}`,
                    a.cedula,
                    a.ciudad,
                    a.telefono,
                    fechaNacFmt,
                    '' 
                ];
            }),
            theme: 'grid',
            headStyles: { 
                fillColor: [220, 220, 220], 
                textColor: 0, 
                lineWidth: 0.1, 
                lineColor: 50,
                fontSize: 10,
                halign: 'center',
                valign: 'middle'
            },
            styles: { 
                fontSize: 9, 
                cellPadding: 1.5, 
                lineColor: 150, 
                lineWidth: 0.1, 
                overflow: 'linebreak',
                valign: 'middle'
            },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' }, 
                1: { cellWidth: 'auto' }, 
                2: { cellWidth: 25 }, 
                3: { cellWidth: 35 }, 
                4: { cellWidth: 30 }, 
                5: { cellWidth: 25, halign: 'center' }, 
                6: { cellWidth: 40 } 
            },
            margin: { top: 25, right: 10, bottom: 10, left: 10 }, 
            didDrawPage: (data) => {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(14);
                doc.text("REUNION NRO. ________", 15, 15);
            }
        });

        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(`Página: ${i}/${totalPages}`, 280, 10, { align: 'right' });
            doc.setFontSize(10);
            doc.text(dateStr, 280, 15, { align: 'right' });
        }

        doc.save(`Listado_Adolescentes_Activos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const renderReportContent = () => {
        switch (activeReport) {
            case 'inscriptosEvento':
                return (
                    <div>
                        <div className="flex flex-col md:flex-row md:items-end gap-6 mb-6 justify-between">
                            <div className="flex flex-col md:flex-row md:items-end gap-6 flex-1">
                                <div className="w-full md:w-auto">
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Filtrar por Evento:</label>
                                    <select 
                                        value={selectedEventoId || ''} 
                                        onChange={(e) => setSelectedEventoId(e.target.value ? Number(e.target.value) : null)} 
                                        className="bg-background border border-border p-2 rounded-md w-full md:w-96"
                                    >
                                        <option value="">-- Todos los Eventos --</option>
                                        {eventos.map(e => <option key={e.id} value={e.id}>{e.tema} ({formatDate(e.fechaInicio)})</option>)}
                                    </select>
                                </div>
                                {selectedEventoId && (
                                    <div className="bg-background/40 px-4 py-2 rounded-lg border border-border flex flex-col justify-center animate-fade-in">
                                        <p className="text-[10px] uppercase font-bold text-text-secondary tracking-widest leading-none mb-1">Total Inscriptos</p>
                                        <p className="text-2xl font-black text-primary leading-none">{(reportData as any[]).length}</p>
                                    </div>
                                )}
                            </div>
                            
                            {selectedEventoId && (
                                <div className="flex flex-wrap gap-2 h-fit mb-1 animate-fade-in">
                                    <button 
                                        onClick={generarExcelBalanceEvento} 
                                        className="flex items-center gap-2 bg-secondary hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg font-bold"
                                    >
                                        <DownloadCloudIcon className="w-5 h-5" />
                                        <span>Exportar Excel</span>
                                    </button>
                                    <button 
                                        onClick={generarPDFBalanceEvento} 
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg font-bold"
                                    >
                                        <PrinterIcon className="w-5 h-5" />
                                        <span>Imprimir PDF</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        <ReportTable headers={['Evento', 'Adolescente', 'Reg. Salud', 'Costo por Persona', 'Monto Pagado', 'Saldo Pendiente']}>
                            {(reportData as any[]).map((row) => (
                                <tr key={row.id} className="hover:bg-background/40 transition-colors">
                                    <td className="p-3 text-xs md:text-sm">{row.eventoNombre}</td>
                                    <td className="p-3 font-medium text-text-primary">{row.adolescenteNombre}</td>
                                    <td className="p-3 text-xs font-mono">{row.adolescenteRegistro}</td>
                                    <td className="p-3 text-right">{row.tieneCosto ? formatCurrency(row.costo) : <span className="text-green-400 font-bold">Gratis</span>}</td>
                                    <td className="p-3 text-right text-green-400 font-bold">{formatCurrency(row.pagado)}</td>
                                    <td className="p-3 text-right">
                                        <span className={`px-3 py-1 rounded-full font-bold ${row.saldo > 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {formatCurrency(row.saldo)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {(reportData as any[]).length === 0 && (
                                <tr><td colSpan={6} className="p-12 text-center text-text-secondary italic">No se encontraron inscripciones registradas.</td></tr>
                            )}
                        </ReportTable>
                    </div>
                );
            case 'entregasDevocionales':
                return (
                    <ReportTable headers={['Posición', 'Adolescente', 'Cédula', 'Total Entregas']}>
                        {(reportData as any[]).map((row, idx) => (
                            <tr key={row.id}>
                                <td className="p-2 text-center font-bold text-primary">{idx + 1}°</td>
                                <td className="p-2 font-medium text-white">{row.nombre}</td>
                                <td className="p-2 text-text-secondary">{row.cedula}</td>
                                <td className="p-2 text-center">
                                    <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-full font-bold">
                                        {row.totalEntregas} entregados
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {(reportData as any[]).length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-text-secondary italic">No se han registrado entregas de devocionales en el presente año.</td></tr>
                        )}
                    </ReportTable>
                );
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
                                <label className="block text-sm font-medium text-text-secondary mb-1">Seleccionar Reunión:</label>
                                <select onChange={(e) => setSelectedReunionId(Number(e.target.value))} className="bg-background border border-border p-2 rounded-md w-full md:w-96">
                                    <option value="">-- Seleccione una reunión --</option>
                                    {reuniones.map(r => (
                                        <option key={r.id} value={r.id}>Nro. {r.id} - {r.tema} - {formatDate(r.fecha)}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedReunionId && (reportData as any[]).length > 0 && (
                                <button onClick={generarPDFAsistencia} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors shadow-md">
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
             case 'activos':
                return (
                    <div>
                        <div className="flex justify-end mb-4">
                            <button onClick={generarPDFActivos} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors shadow-md">
                                <PrinterIcon className="w-5 h-5" />
                                <span>Imprimir PDF (Hoja de Firmas)</span>
                            </button>
                        </div>
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
                    </div>
                );
            case 'tutores':
                 return (
                    <ReportTable headers={['Adolescente', 'Tutores Asignados (Nombre - Parentesco - Teléfono)']}>
                        {(reportData as any[]).map(item => (
                            <tr key={item.id} className="border-b border-border/50">
                                <td className="p-3 align-top font-medium text-text-primary">{item.nombre} {item.apellido}</td>
                                <td className="p-3 align-top">
                                    {item.tutores && item.tutores.length > 0 ? (
                                        <ul className="space-y-1">
                                            {item.tutores.map((t: any) => (
                                                <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                                                    <span className="text-text-primary font-medium">{t.nombre} {t.apellido}</span>
                                                    <span className="text-text-secondary text-xs bg-surface px-2 py-0.5 rounded-full border border-border">
                                                        {t.parentesco}
                                                    </span>
                                                    {t.telefono ? (
                                                        <span className="text-green-400 font-mono text-xs flex items-center gap-1">
                                                            <span>📞</span> {t.telefono}
                                                        </span>
                                                    ) : (
                                                        <span className="text-text-secondary text-xs italic">Sin teléfono</span>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-text-secondary italic text-sm">No tiene tutores registrados.</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </ReportTable>
                 );
            case 'pagosEvento':
                return (
                    <div>
                         <div className="mb-4">
                            <label className="block text-sm font-medium text-text-secondary mb-1">Seleccionar Evento:</label>
                            <select value={selectedEventoId || ''} onChange={(e) => setSelectedEventoId(Number(e.target.value))} className="bg-background border border-border p-2 rounded-md w-full md:w-96">
                                <option value="">-- Seleccione un evento --</option>
                                {eventos.map(e => <option key={e.id} value={e.id}>{e.tema} ({formatDate(e.fechaInicio)})</option>)}
                            </select>
                         </div>
                         {selectedEventoId && (
                             <ReportTable headers={['Fecha Pago', 'Adolescente', 'Cédula', 'Monto']}>
                                {(reportData as any[]).map(p => (
                                    <tr key={p.id}>
                                        <td className="p-2">{formatDate(p.fecha)}</td>
                                        <td className="p-2">{p.adolescenteNombre}</td>
                                        <td className="p-2">{p.adolescenteCedula}</td>
                                        <td className="p-2 text-right font-mono text-green-400">{formatCurrency(p.monto)}</td>
                                    </tr>
                                ))}
                             </ReportTable>
                         )}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Reportes</h1>
                <button onClick={handleRefresh} disabled={isRefreshing} className="flex items-center gap-2 bg-surface hover:bg-gray-700 text-text-secondary px-3 py-2 rounded-lg transition-colors">
                    <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Sincronizando...' : 'Refrescar Datos'}</span>
                </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <TabButton name="Balance Eventos" id="inscriptosEvento" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Entregas Devocionales" id="entregasDevocionales" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Resumen de Asistencia" id="resumenAsistencia" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Cumpleaños del Mes" id="cumpleanos" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Lista de Asistentes" id="asistenciaReunion" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Ausencias por Período" id="ausencias" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Adolescentes Activos" id="activos" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Adolescentes y Tutores" id="tutores" active={activeReport} setActive={setActiveReport} />
                <TabButton name="Historial de Pagos" id="pagosEvento" active={activeReport} setActive={setActiveReport} />
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                <div className="mb-6 border-b border-border pb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                        {activeReport === 'inscriptosEvento' && <CalendarDaysIcon className="text-primary w-6 h-6" />}
                        {activeReport === 'entregasDevocionales' && <BookOpenIcon className="text-secondary w-6 h-6" />}
                        {activeReport === 'inscriptosEvento' ? 'Balances y Deudas de Inscriptos' : 'Detalle del Reporte'}
                    </h2>
                </div>
                {renderReportContent()}
            </div>
        </div>
    );
};


const TabButton: React.FC<{name: string, id: ReportType, active: ReportType, setActive: (id: ReportType) => void}> = ({name, id, active, setActive}) => (
    <button onClick={() => setActive(id)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${active === id ? 'bg-primary text-white shadow-lg' : 'bg-background hover:bg-gray-700 text-text-secondary'}`}>
        {name}
    </button>
);

const ReportTable: React.FC<{headers: string[], children: React.ReactNode}> = ({headers, children}) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-text-secondary">
            <thead className="text-xs text-text-primary uppercase bg-background">
                <tr>
                    {headers.map(h => <th key={h} scope="col" className={`px-4 py-3 ${h.includes('Total') || h.includes('Posición') || h.includes('%') || h.includes('Costo') || h.includes('Pagado') || h.includes('Saldo') ? 'text-right' : 'text-left'}`}>{h}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {children}
            </tbody>
        </table>
    </div>
);

export default Reportes;
