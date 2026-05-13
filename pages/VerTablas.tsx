import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { DatabaseIcon, RefreshIcon } from '../components/ui/Icons';

const TABLES = [
  'usuarios',
  'roles',
  'adolescentes',
  'encargados',
  'reuniones',
  'asistencias',
  'tutores',
  'tutor_adolescente',
  'eventos',
  'inscripciones_eventos',
  'pagos_eventos',
  'participantes_eventos',
  'devocionales',
  'entregas_devocionales',
  'celebraciones_cumpleanos',
  'servidores',
  'inscripciones_servidores',
  'pagos_servidores'
];

const VerTablas: React.FC = () => {
  const { rol } = useAuth();
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Solo administradores pueden ver esto (rolId === 1)
  const isAdmin = rol?.id === 1 || rol?.nombre?.toLowerCase() === 'admin' || rol?.nombre?.toLowerCase() === 'administrador';

  const fetchData = async (tableName: string) => {
    if (!tableName) return;
    
    setLoading(true);
    setError(null);
    try {
      const querySnapshot = await getDocs(collection(db, tableName));
      const fetchedData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(fetchedData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los datos de la tabla.");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTable) {
      fetchData(selectedTable);
    } else {
      setData([]);
    }
  }, [selectedTable]);

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600">Acceso Denegado</h2>
        <p className="mt-2 text-text-secondary">No tienes permisos para ver esta página. Solo los administradores pueden acceder.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <DatabaseIcon className="w-6 h-6 text-primary" />
            Visor de Tablas
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Visualiza los datos crudos de las colecciones de Firebase.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none flex-1 sm:flex-none min-w-[200px]"
          >
            <option value="">Seleccionar tabla...</option>
            {TABLES.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
          
          <button
            onClick={() => fetchData(selectedTable)}
            disabled={!selectedTable || loading}
            className="p-2 bg-primary text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            title="Recargar datos"
          >
            <RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {selectedTable && !loading && data.length === 0 && !error && (
        <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-secondary">
          La tabla "{selectedTable}" está vacía.
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background border-b border-border">
                  {/* Obtener todas las claves únicas de todos los objetos para las columnas */}
                  {Array.from(new Set(data.flatMap(item => Object.keys(item)))).map(key => (
                    <th key={key} className="px-4 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-background/50 transition-colors">
                    {Array.from(new Set(data.flatMap(i => Object.keys(i)))).map(key => (
                      <td key={key} className="px-4 py-3 text-sm text-text-primary whitespace-nowrap max-w-xs truncate" title={typeof item[key] === 'object' ? JSON.stringify(item[key]) : String(item[key] ?? '')}>
                        {item[key] === undefined || item[key] === null 
                          ? <span className="text-text-secondary italic">null</span>
                          : typeof item[key] === 'object' 
                            ? <span className="text-xs font-mono bg-background px-1 py-0.5 rounded text-text-secondary">{JSON.stringify(item[key])}</span>
                            : typeof item[key] === 'boolean'
                              ? <span className={`px-2 py-0.5 rounded-full text-xs ${item[key] ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{item[key] ? 'true' : 'false'}</span>
                              : String(item[key])
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-background text-xs text-text-secondary">
            Total de registros: <span className="font-semibold text-text-primary">{data.length}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerTablas;
