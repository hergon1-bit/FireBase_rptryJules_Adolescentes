
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { formatDate, formatCurrency } from '../utils/helpers';
import { RefreshIcon, CalculatorIcon, PrinterIcon, DownloadCloudIcon, UsersIcon, CheckCircleIcon, ClipboardListIcon, ShieldIcon, HeartHandshakeIcon } from '../components/ui/Icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type FinReportType = 'balance' | 'historial';

const ReportesFinancieros: React.FC = () => {
    const { 
        adolescentes, eventos, inscripciones, pagos, servidores, 
        inscripcionesServidores, pagosServidores, fetchData 
    } = useData();
    const [activeReport, setActiveReport] = useState<FinReportType>('balance');
    const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);
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

    // Datos para la pestaña de Balance (Resumen por persona)
    const summaryData = useMemo(() => {
        if (!selectedEventoId) return [];
        const event = eventos.find(e => e.id === selectedEventoId);
        const costoPersonaDefault = event?.costoPersona || 0;

        const dataChicos = inscripciones.filter(i => i.eventoId === selectedEventoId).map(i => {
            const ado = adolescentes.find(a => a.id === i.adolescenteId);
            const pagosAdo = pagos.filter(p => p.inscripcionId === i.id);
            const totalPagado = pagosAdo.reduce((sum, p) => sum + p.monto, 0);
            return {
                tipo: 'CHICO',
                nombre: ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido',
                rol: 'Participante',
                pagado: totalPagado,
                saldo: Math.max(0, costoPersonaDefault - totalPagado),
                beca: 'Ninguna',
                precioLocal: false
            };
        });

        const dataServidores = inscripcionesServidores.filter(i => i.eventoId === selectedEventoId).map(i => {
            const s = servidores.find(ser => ser.id === i.servidorId);
            const pagosS = pagosServidores.filter(p => p.inscripcionServidorId === i.id);
            const totalPagado = pagosS.reduce((sum, p) => sum + p.monto, 0);
            
            let saldoCalculado = 0;
            const montoAcordado = i.montoAcordado || 0;

            if (i.precioEspecialLocal) {
                saldoCalculado = Math.max(0, montoAcordado - totalPagado);
            } else if (i.tipoBeca === 'Total') {
                saldoCalculado = 0;
            } else if (i.tipoBeca === 'Parcial') {
                saldoCalculado = Math.max(0, montoAcordado - totalPagado);
            } else {
                saldoCalculado = Math.max(0, costoPersonaDefault - totalPagado);
            }

            return {
                tipo: 'APOYO',
                nombre: s ? `${s.nombre} ${s.apellido}` : 'Desconocido',
                rol: i.rol,
                pagado: totalPagado,
                saldo: saldoCalculado,
                beca: i.tipoBeca || 'Ninguna',
                precioLocal: i.precioEspecialLocal || false
            };
        });

        return [...dataChicos, ...dataServidores].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }, [adolescentes, eventos, inscripciones, pagos, servidores, inscripcionesServidores, pagosServidores, selectedEventoId]);

    // Datos para la pestaña de Historial (Listado de transacciones)
    const historyData = useMemo(() => {
        if (!selectedEventoId) return [];
        
        const eventAdoInsc = inscripciones.filter(i => i.eventoId === selectedEventoId);
        const eventSerInsc = inscripcionesServidores.filter(i => i.eventoId === selectedEventoId);

        const adoPayments = pagos.filter(p => eventAdoInsc.some(i => i.id === p.inscripcionId)).map(p => {
            const insc = eventAdoInsc.find(i => i.id === p.inscripcionId)!;
            const ado = adolescentes.find(a => a.id === insc.adolescenteId);
            return {
                id: p.id,
                fecha: p.fecha,
                nombre: ado ? `${ado.nombre} ${ado.apellido}` : 'Desconocido',
                tipo: 'CHICO',
                rol: 'Participante',
                monto: p.monto,
                notas: ''
            };
        });

        const serPayments = pagosServidores.filter(p => eventSerInsc.some(i => i.id === p.inscripcionServidorId)).map(p => {
            const insc = eventSerInsc.find(i => i.id === p.inscripcionServidorId)!;
            const ser = servidores.find(s => s.id === insc.servidorId);
            return {
                id: p.id,
                fecha: p.fecha,
                nombre: ser ? `${ser.nombre} ${ser.apellido}` : 'Desconocido',
                tipo: 'APOYO',
                rol: insc.rol,
                monto: p.monto,
                notas: p.notas || ''
            };
        });

        // UI muestra orden descendente (más nuevos primero)
        return [...adoPayments, ...serPayments].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [selectedEventoId, inscripciones, inscripcionesServidores, pagos, pagosServidores, adolescentes, servidores]);

    const balanceTotals = useMemo(() => {
        if (!selectedEventoId) return null;
        const ev = eventos.find(e => e.id === selectedEventoId);
        const costoBase = ev?.costoPersona || 0;
        
        let sumaBecasReal = 0;
        let montoTotalAgreements = 0;

        inscripcionesServidores.filter(i => i.eventoId === selectedEventoId).forEach(i => {
            const agreed = i.montoAcordado || 0;
            if (i.precioEspecialLocal) {
                montoTotalAgreements += agreed;
            } else {
                if (i.tipoBeca === 'Total') sumaBecasReal += costoBase;
                else if (i.tipoBeca === 'Parcial') sumaBecasReal += (costoBase - agreed);
            }
        });

        // Cálculos de cantidades
        const cantInscriptos = summaryData.length;
        const cantPagadosFull = summaryData.filter(r => r.saldo <= 0).length;
        const cantPendientes = summaryData.filter(r => r.saldo > 0).length;
        const cantBecados = summaryData.filter(r => (r.beca === 'Parcial' || r.beca === 'Total') && !r.precioLocal).length;
        const cantAcuerdosLocales = summaryData.filter(r => r.precioLocal).length;

        return {
            pagosRealizados: summaryData.reduce((acc, r) => acc + (r.pagado || 0), 0),
            saldosPendientes: summaryData.reduce((acc, r) => acc + (r.saldo || 0), 0),
            becasCargoIglesia: sumaBecasReal,
            ahorroAcuerdoLocal: montoTotalAgreements,
            cantInscriptos,
            cantPagadosFull,
            cantPendientes,
            cantBecados,
            cantAcuerdosLocales
        };
    }, [selectedEventoId, summaryData, inscripcionesServidores, eventos]);

    const handleExportExcel = () => {
        if (!selectedEventoId || historyData.length === 0) return;
        
        const event = eventos.find(e => e.id === selectedEventoId);
        const now = new Date();
        const reportDate = now.toLocaleDateString('es-PY');
        const reportTime = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

        // Ordenar cronológicamente (ascendente) para el reporte
        const sortedData = [...historyData].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

        const headers = ["Fecha", "Nombre", "Tipo", "Rol", "Monto", "Notas"];
        
        // Construcción del archivo CSV con encabezados metadata
        const metadata = [
            ["HISTORIAL DE PAGOS"],
            [`Evento:;${event?.tema || 'N/A'}`],
            [`Fecha de Generación:;${reportDate}`],
            [`Hora de Generación:;${reportTime}`],
            [""], // Espaciador
            [headers.join(';')]
        ];

        const dataRows = sortedData.map(h => [
            formatDate(h.fecha), 
            h.nombre, 
            h.tipo, 
            h.rol, 
            h.monto, 
            h.notas || ''
        ].join(';'));

        const csvContent = metadata.map(m => m.join(';')).join('\n') + '\n' + dataRows.join('\n');

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); 
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Historial_Pagos_${event?.tema.replace(/\s+/g, '_') || 'evento'}.csv`;
        link.click();
    };

    const handlePrintPDF = () => {
        if (!selectedEventoId || historyData.length === 0) return;
        const event = eventos.find(e => e.id === selectedEventoId);
        const doc = new jsPDF();
        
        // Estilos de encabezado
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text(`Historial Detallado de Pagos`, 14, 15);
        
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text(`Evento: ${event?.tema}`, 14, 25);
        doc.text(`Fecha del Informe: ${new Date().toLocaleString()}`, 14, 32);

        const tableData = historyData.map(h => [
            formatDate(h.fecha),
            h.nombre,
            h.tipo,
            h.rol,
            formatCurrency(h.monto),
            h.notas || '-'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['Fecha', 'Nombre', 'Tipo', 'Rol', 'Monto', 'Notas']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillStyle: 'f', fillColor: [79, 70, 229] }, // Color Primary
            foot: [['', '', '', 'TOTAL COBRADO:', formatCurrency(balanceTotals?.pagosRealizados || 0), '']],
            footStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' }
        });

        doc.save(`historial_pagos_${event?.tema}.pdf`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                        <CalculatorIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Balance Financiero</h1>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => setActiveReport('balance')} 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeReport === 'balance' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary border border-border hover:bg-background'}`}
                    >
                        Balance General
                    </button>
                    <button 
                        onClick={() => setActiveReport('historial')} 
                        className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeReport === 'historial' ? 'bg-primary text-white shadow-md' : 'bg-surface text-text-secondary border border-border hover:bg-background'}`}
                    >
                        Historial de Pagos
                    </button>
                </div>
            </div>
            
            <div className="bg-surface p-6 rounded-xl shadow-lg border border-border">
                <div className="flex justify-between items-end mb-8 gap-4 flex-wrap">
                    <div className="flex-1 min-w-[300px]">
                        <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-widest">Seleccionar Evento</label>
                        <select 
                            value={selectedEventoId || ''} 
                            onChange={e => setSelectedEventoId(Number(e.target.value))} 
                            className="bg-background border border-border p-3 rounded-lg w-full text-text-primary focus:ring-2 ring-primary outline-none transition-all"
                        >
                            <option value="">-- Seleccione un evento para ver finanzas --</option>
                            {eventos.filter(e => e.tieneCosto).map(e => (
                                <option key={e.id} value={e.id}>{e.tema} ({formatDate(e.fechaInicio)})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        {activeReport === 'historial' && selectedEventoId && historyData.length > 0 && (
                            <>
                                <button 
                                    onClick={handleExportExcel}
                                    className="bg-secondary text-white p-3 rounded-lg hover:bg-emerald-600 transition-colors shadow-md"
                                    title="Exportar a Excel"
                                >
                                    <DownloadCloudIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={handlePrintPDF}
                                    className="bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 transition-colors shadow-md border border-border"
                                    title="Imprimir PDF"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button onClick={handleRefresh} className="bg-background border border-border p-3 rounded-lg text-text-secondary hover:text-primary transition-all">
                            <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {selectedEventoId && balanceTotals ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* Indicadores Clave de Montos */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-5 bg-background/50 rounded-xl border border-border shadow-inner group">
                                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter mb-1">Cobrado en Caja</p>
                                <p className="text-2xl font-black text-green-400">{formatCurrency(balanceTotals.pagosRealizados)}</p>
                            </div>
                            <div className="p-5 bg-background/50 rounded-xl border border-border shadow-inner group">
                                <p className="text-[10px] text-text-secondary uppercase font-bold tracking-tighter mb-1">Saldo Pendiente</p>
                                <p className="text-2xl font-black text-red-400">{formatCurrency(balanceTotals.saldosPendientes)}</p>
                            </div>
                            <div className="p-5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-inner group">
                                <p className="text-[10px] text-indigo-300 uppercase font-bold tracking-tighter mb-1">Becas (Iglesia)</p>
                                <p className="text-2xl font-black text-indigo-400">{formatCurrency(balanceTotals.becasCargoIglesia)}</p>
                            </div>
                            <div className="p-5 bg-orange-500/10 rounded-xl border border-orange-500/20 shadow-inner group">
                                <p className="text-[10px] text-orange-300 uppercase font-bold tracking-tighter mb-1">Acuerdos Locales</p>
                                <p className="text-2xl font-black text-orange-400">{formatCurrency(balanceTotals.ahorroAcuerdoLocal)}</p>
                            </div>
                        </div>

                        {/* Indicadores de Cantidades */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="p-3 bg-surface border border-border rounded-lg flex flex-col items-center justify-center text-center">
                                <ClipboardListIcon className="w-5 h-5 text-text-secondary mb-1" />
                                <span className="text-[9px] uppercase font-bold text-text-secondary">Inscriptos</span>
                                <span className="text-xl font-black text-text-primary">{balanceTotals.cantInscriptos}</span>
                            </div>
                            <div className="p-3 bg-surface border border-border rounded-lg flex flex-col items-center justify-center text-center">
                                <CheckCircleIcon className="w-5 h-5 text-green-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-green-400">Totalmente Pagados</span>
                                <span className="text-xl font-black text-green-400">{balanceTotals.cantPagadosFull}</span>
                            </div>
                            <div className="p-3 bg-surface border border-border rounded-lg flex flex-col items-center justify-center text-center">
                                <RefreshIcon className="w-5 h-5 text-red-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-red-400">Con Saldo</span>
                                <span className="text-xl font-black text-red-400">{balanceTotals.cantPendientes}</span>
                            </div>
                            <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg flex flex-col items-center justify-center text-center">
                                <ShieldIcon className="w-5 h-5 text-indigo-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-indigo-400">Becados (Staff)</span>
                                <span className="text-xl font-black text-indigo-400">{balanceTotals.cantBecados}</span>
                            </div>
                            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg flex flex-col items-center justify-center text-center">
                                <HeartHandshakeIcon className="w-5 h-5 text-orange-400 mb-1" />
                                <span className="text-[9px] uppercase font-bold text-orange-400">Acuerdos Locales</span>
                                <span className="text-xl font-black text-orange-400">{balanceTotals.cantAcuerdosLocales}</span>
                            </div>
                        </div>

                        {/* Contenido de la Tabla según Pestaña */}
                        <div className="overflow-x-auto rounded-xl border border-border bg-background/30">
                            {activeReport === 'balance' ? (
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-background text-text-secondary uppercase text-[10px] font-black tracking-widest">
                                        <tr>
                                            <th className="p-4">Tipo</th>
                                            <th className="p-4">Nombre</th>
                                            <th className="p-4">Acuerdo / Beca</th>
                                            <th className="p-4 text-right">Pagado</th>
                                            <th className="p-4 text-right">Pendiente</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {summaryData.map((r, i) => (
                                            <tr key={i} className="hover:bg-background/40 transition-colors group">
                                                <td className={`p-4 font-bold text-[10px] ${r.tipo === 'CHICO' ? 'text-primary' : 'text-purple-400'}`}>{r.tipo}</td>
                                                <td className="p-4 font-medium text-text-primary group-hover:text-primary">{r.nombre}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {r.beca !== 'Ninguna' && !r.precioLocal && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded uppercase font-black border border-indigo-500/30">Beca {r.beca}</span>}
                                                        {r.precioLocal && <span className="text-[8px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded uppercase font-black border border-orange-500/30">Acuerdo Local</span>}
                                                        {!r.precioLocal && r.beca === 'Ninguna' && <span className="text-[8px] text-text-secondary uppercase">Estándar</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-black text-green-400">{formatCurrency(r.pagado)}</td>
                                                <td className={`p-4 text-right font-black ${r.saldo > 0 ? 'text-red-400' : 'text-green-500'}`}>{formatCurrency(r.saldo)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-background text-text-secondary uppercase text-[10px] font-black tracking-widest">
                                        <tr>
                                            <th className="p-4">Fecha</th>
                                            <th className="p-4">Persona</th>
                                            <th className="p-4">Tipo / Rol</th>
                                            <th className="p-4 text-right">Monto Cobrado</th>
                                            <th className="p-4">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {historyData.map((h) => (
                                            <tr key={h.id} className="hover:bg-background/40 transition-colors group">
                                                <td className="p-4 font-mono text-xs text-text-secondary">{formatDate(h.fecha)}</td>
                                                <td className="p-4 font-bold text-text-primary group-hover:text-primary">{h.nombre}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className={`text-[10px] font-black uppercase ${h.tipo === 'CHICO' ? 'text-primary' : 'text-purple-400'}`}>{h.tipo}</span>
                                                        <span className="text-[9px] text-text-secondary italic">{h.rol}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-black text-green-400">{formatCurrency(h.monto)}</td>
                                                <td className="p-4 text-xs text-text-secondary italic max-w-xs truncate">{h.notas || '-'}</td>
                                            </tr>
                                        ))}
                                        {historyData.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-10 text-center text-text-secondary italic">No se han registrado pagos para este evento todavía.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="bg-background/50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                            <CalculatorIcon className="w-10 h-10 text-border" />
                        </div>
                        <p className="text-text-secondary italic">Selecciona un evento con costo en la parte superior para visualizar los informes financieros detallados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportesFinancieros;
