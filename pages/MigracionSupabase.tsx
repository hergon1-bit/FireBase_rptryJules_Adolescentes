import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { api } from '../services/api';
import { RefreshIcon, CheckCircleIcon, UploadCloudIcon } from '../components/ui/Icons';
import { useData } from '../contexts/DataContext';

const MigracionSupabase: React.FC = () => {
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [isMigrating, setIsMigrating] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);
    const { fetchData } = useData();

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, msg]);
        setStatus(msg);
    };

    const handleMigration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabaseUrl || !supabaseKey) {
            addLog('Por favor, ingresa la URL y la Anon Key de Supabase.');
            return;
        }

        setIsMigrating(true);
        setLogs([]);
        addLog('Iniciando conexión con Supabase...');

        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            
            // Lista de tablas a migrar (ordenadas por dependencias si es posible)
            const tables = [
                'roles',
                'usuarios',
                'adolescentes',
                'servidores',
                'encargados',
                'tutores',
                'tutor_adolescente',
                'reuniones',
                'asistencias',
                'eventos',
                'inscripciones_eventos',
                'pagos_eventos',
                'participantes_eventos',
                'inscripciones_servidores',
                'pagos_servidores',
                'celebraciones_cumpleanos',
                'devocionales',
                'entregas_devocionales'
            ];

            for (const table of tables) {
                addLog(`Leyendo datos de la tabla: ${table}...`);
                
                let allData: any[] = [];
                let from = 0;
                const step = 1000;
                let hasMore = true;
                let fetchError = null;

                while (hasMore) {
                    const { data, error } = await supabase.from(table).select('*').range(from, from + step - 1);
                    if (error) {
                        fetchError = error;
                        hasMore = false;
                        continue;
                    }
                    if (data && data.length > 0) {
                        allData = [...allData, ...data];
                        from += step;
                        if (data.length < step) {
                            hasMore = false;
                        }
                    } else {
                        hasMore = false;
                    }
                }
                
                if (fetchError) {
                    addLog(`Error al leer ${table}: ${fetchError.message}`);
                    continue;
                }

                const data = allData;

                if (!data || data.length === 0) {
                    addLog(`Tabla ${table} está vacía. Saltando...`);
                    continue;
                }

                addLog(`Migrando ${data.length} registros de ${table} a Firebase...`);
                
                // Migrar usando la API existente o directamente a Firestore
                // Para simplificar y asegurar que se usan los IDs originales (si es necesario),
                // usaremos la función de limpieza y luego inserción masiva si existe, 
                // o iteraremos.
                
                // Limpiamos la tabla en Firebase primero para evitar duplicados en la migración inicial
                await api.clearTable(table);

                // Insertar uno por uno para mantener IDs si es posible, o dejar que Firebase asigne si no importa.
                // En una migración real, es vital mantener los IDs relacionales.
                const { writeBatch, doc, collection } = await import('firebase/firestore');
                const { db } = await import('../services/firebase');
                
                // Batch writes for efficiency (max 500 per batch)
                const chunks = [];
                for (let i = 0; i < data.length; i += 400) {
                    chunks.push(data.slice(i, i + 400));
                }

                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    for (const item of chunk) {
                        // Si el item tiene un 'id', lo usamos como ID del documento en Firestore
                        // Si no, dejamos que Firestore genere uno.
                        const docId = item.id ? String(item.id) : undefined;
                        const docRef = docId ? doc(db, table, docId) : doc(collection(db, table));
                        
                        // Convertir claves de snake_case a camelCase
                        const cleanItem: any = {};
                        Object.keys(item).forEach(key => {
                            if (item[key] !== undefined) {
                                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                                cleanItem[camelKey] = item[key];
                            }
                        });

                        batch.set(docRef, cleanItem);
                    }
                    await batch.commit();
                }
                
                addLog(`✅ Tabla ${table} migrada correctamente.`);
            }

            addLog('🎉 ¡Migración completada con éxito!');
            await fetchData(); // Refrescar el contexto global
        } catch (error: any) {
            console.error(error);
            addLog(`❌ Error crítico durante la migración: ${error.message}`);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">Migración desde Supabase</h1>
            <p className="text-text-secondary">
                Esta herramienta copiará todos los datos de tu base de datos Supabase a tu nueva base de datos en Firebase.
                <br />
                <strong>Atención:</strong> Esto reemplazará los datos existentes en Firebase para las tablas migradas.
            </p>

            <div className="bg-surface p-6 rounded-lg shadow-lg border border-border">
                <form onSubmit={handleMigration} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Supabase Project URL</label>
                        <input
                            type="url"
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            required
                            placeholder="https://xyzcompany.supabase.co"
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary transition-all outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Supabase Service Role Key (Secret)</label>
                        <input
                            type="password"
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            required
                            placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-text-primary transition-all outline-none"
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            Debes usar la <strong>service_role secret</strong> key, NO la anon key. Esto es necesario para saltar las reglas RLS y poder leer todas las tablas.
                        </p>
                    </div>
                    
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isMigrating}
                            className="w-full flex justify-center items-center bg-primary text-white py-3 px-4 rounded-lg hover:bg-indigo-600 transition-colors font-bold disabled:opacity-50"
                        >
                            {isMigrating ? (
                                <>
                                    <RefreshIcon className="w-5 h-5 animate-spin mr-2" />
                                    Migrando Datos...
                                </>
                            ) : (
                                <>
                                    <UploadCloudIcon className="w-5 h-5 mr-2" />
                                    Iniciar Migración
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {logs.length > 0 && (
                <div className="bg-surface p-6 rounded-lg shadow-lg border border-border">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-400" />
                        Registro de Migración
                    </h2>
                    <div className="bg-background p-4 rounded-md h-64 overflow-y-auto font-mono text-sm space-y-2">
                        {logs.map((log, index) => (
                            <div key={index} className={`${log.includes('❌') ? 'text-red-400' : log.includes('✅') || log.includes('🎉') ? 'text-green-400' : 'text-text-secondary'}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MigracionSupabase;
