
import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Asistencia, AsistenciaDetalle, TipoAsistencia, Page } from '../types';
import { formatDate } from '../utils/helpers';

interface AsistenciaProps {
  reunionId: number;
  navigateTo: (page: Page) => void;
}

const Asistencia: React.FC<AsistenciaProps> = ({ reunionId, navigateTo }) => {
    const { reuniones, adolescentes, asistencias: initialAsistencias, saveAsistencias, updateReunion } = useData();
    const [asistenciaLocal, setAsistenciaLocal] = useState<Map<number, Asistencia>>(new Map());
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const reunion = reuniones.find(r => r.id === reunionId);

    const adolescentesActivos = adolescentes.filter(a => a.estado === 'Activo');

    const filteredAdolescentes = adolescentesActivos.filter(a =>
        `${a.nombre} ${a.apellido}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const initializeAsistencias = useCallback(() => {
        const newMap = new Map<number, Asistencia>();
        adolescentesActivos.forEach(ado => {
            const existingAsistencia = initialAsistencias.find(a => a.reunionId === reunionId && a.adolescenteId === ado.id);
            if (existingAsistencia) {
                newMap.set(ado.id, existingAsistencia);
            } else {
                newMap.set(ado.id, {
                    reunionId: reunionId,
                    adolescenteId: ado.id,
                    estado: 'Ausente',
                    detalle: 'Regular',
                });
            }
        });
        setAsistenciaLocal(newMap);
    }, [reunionId, adolescentesActivos, initialAsistencias]);

    useEffect(() => {
        initializeAsistencias();
    }, [initializeAsistencias]);
    
    const handleAsistenciaChange = (adolescenteId: number, estado: TipoAsistencia) => {
        setAsistenciaLocal(prevMap => {
            const current = prevMap.get(adolescenteId);
            if (!current) return prevMap;

            const newMap = new Map(prevMap);
            const updatedAsistencia: Asistencia = {
                ...current,
                estado,
                // If status is 'Ausente', reset detail to 'Regular', otherwise keep the current detail.
                detalle: estado === 'Ausente' ? 'Regular' : current.detalle,
            };
            newMap.set(adolescenteId, updatedAsistencia);
            return newMap;
        });
    };

    const handleDetalleChange = (adolescenteId: number, detalle: AsistenciaDetalle) => {
        setAsistenciaLocal(prevMap => {
            const current = prevMap.get(adolescenteId);
            if (current) {
                const newMap = new Map(prevMap);
                newMap.set(adolescenteId, { ...current, detalle });
                return newMap;
            }
            return prevMap;
        });
    };
    
    const handleGuardar = async (finalizar: boolean) => {
        setIsLoading(true);
        // FIX: Replaced `Array.from` with spread syntax to correctly convert the Map iterator to an array.
        const asistenciasArray = [...asistenciaLocal.values()];
        await saveAsistencias(asistenciasArray);
        if (finalizar && reunion) {
            await updateReunion({ ...reunion, estado: 'Finalizado' });
        }
        setIsLoading(false);
        navigateTo('reuniones');
    };

    if (!reunion) {
        return <div className="text-center text-text-secondary">Reunión no encontrada.</div>;
    }

    // FIX: Replaced `Array.from` with spread syntax to correctly convert the Map iterator for filtering.
    const presentes = [...asistenciaLocal.values()].filter(a => a.estado === 'Presente').length;
    const ausentes = adolescentesActivos.length - presentes;

    return (
        <div className="space-y-6">
            <div>
                <button onClick={() => navigateTo('reuniones')} className="text-primary hover:underline mb-4">&larr; Volver a Reuniones</button>
                <h1 className="text-3xl font-bold">Toma de Asistencia</h1>
                <p className="text-xl text-text-secondary">{reunion.tema} - {formatDate(reunion.fecha)}</p>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-surface rounded-lg">
                <input
                    type="text"
                    placeholder="Buscar adolescente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 bg-background border border-border rounded-md"
                />
                <div className="flex space-x-6 text-center">
                    <div>
                        <p className="text-2xl font-bold text-green-400">{presentes}</p>
                        <p className="text-sm text-text-secondary">Presentes</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-400">{ausentes}</p>
                        <p className="text-sm text-text-secondary">Ausentes</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-text-primary">{adolescentesActivos.length}</p>
                        <p className="text-sm text-text-secondary">Total</p>
                    </div>
                </div>
            </div>

            <div className="bg-surface shadow-lg rounded-lg overflow-hidden">
                <div className="overflow-y-auto max-h-[60vh]">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-background sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Adolescente</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase">Estado</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAdolescentes.map(ado => {
                                const asistencia = asistenciaLocal.get(ado.id);
                                if (!asistencia) return null;

                                return (
                                <tr key={ado.id} className={asistencia.estado === 'Presente' ? 'bg-green-900/20' : ''}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">{ado.nombre} {ado.apellido}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex justify-center space-x-2">
                                            <button onClick={() => handleAsistenciaChange(ado.id, 'Presente')} className={`px-3 py-1 text-sm rounded-full transition ${asistencia.estado === 'Presente' ? 'bg-green-500 text-white' : 'bg-surface hover:bg-green-500/20'}`}>Presente</button>
                                            <button onClick={() => handleAsistenciaChange(ado.id, 'Ausente')} className={`px-3 py-1 text-sm rounded-full transition ${asistencia.estado === 'Ausente' ? 'bg-red-500 text-white' : 'bg-surface hover:bg-red-500/20'}`}>Ausente</button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <select 
                                            value={asistencia.detalle} 
                                            onChange={(e) => handleDetalleChange(ado.id, e.target.value as AsistenciaDetalle)} 
                                            className="bg-background border border-border rounded-md px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={asistencia.estado === 'Ausente'}
                                        >
                                            <option value="Regular">Regular</option>
                                            <option value="Primera Vez">Primera Vez</option>
                                            <option value="Regresa">Regresa</option>
                                        </select>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="flex justify-end space-x-4">
                 <button 
                    onClick={() => handleGuardar(false)} 
                    disabled={isLoading}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                    {isLoading ? 'Guardando...' : 'Guardar Parcial'}
                </button>
                <button 
                    onClick={() => handleGuardar(true)} 
                    disabled={isLoading}
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                    {isLoading ? 'Finalizando...' : 'Guardar y Finalizar Reunión'}
                </button>
            </div>

        </div>
    );
};

export default Asistencia;