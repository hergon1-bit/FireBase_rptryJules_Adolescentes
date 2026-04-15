import React from 'react';
import { UploadCloudIcon, ShieldIcon } from '../components/ui/Icons';

const MigracionSupabase: React.FC = () => {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold">Migración desde Supabase</h1>

            <div className="bg-yellow-900/20 border border-yellow-700/50 p-6 rounded-lg flex gap-4 items-start">
                <ShieldIcon className="w-8 h-8 text-yellow-500 shrink-0" />
                <div>
                    <h2 className="text-xl font-semibold text-yellow-500 mb-2">Aviso de Seguridad</h2>
                    <p className="text-text-secondary">
                        Para proteger la integridad de los datos y evitar la exposición de claves sensibles (Service Role Key),
                        la herramienta de migración directa desde el navegador ha sido desactivada.
                        Las migraciones ahora deben realizarse de forma segura desde un entorno controlado.
                    </p>
                </div>
            </div>

            <div className="bg-surface p-8 rounded-lg shadow-lg border border-border space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <UploadCloudIcon className="w-6 h-6 text-primary" />
                    Cómo migrar los datos
                </h2>

                <p className="text-text-secondary">
                    Sigue estos pasos para realizar la migración de forma segura utilizando el script proporcionado en el repositorio:
                </p>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                        <div>
                            <h3 className="font-semibold">Preparar el entorno</h3>
                            <p className="text-sm text-text-secondary">Abre una terminal en la raíz del proyecto localmente.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                        <div>
                            <h3 className="font-semibold">Configurar variables de entorno</h3>
                            <p className="text-sm text-text-secondary">Configura las credenciales de Supabase en tu terminal:</p>
                            <pre className="bg-background p-3 rounded mt-2 text-xs font-mono text-text-primary overflow-x-auto">
                                export SUPABASE_URL="tu-url-de-supabase"<br />
                                export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
                            </pre>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">3</div>
                        <div>
                            <h3 className="font-semibold">Ejecutar el script de migración</h3>
                            <p className="text-sm text-text-secondary">Ejecuta el siguiente comando para iniciar el proceso:</p>
                            <pre className="bg-background p-3 rounded mt-2 text-xs font-mono text-text-primary overflow-x-auto">
                                npx tsx migrate_supabase.ts
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-border mt-6">
                    <p className="text-xs text-text-secondary italic">
                        Nota: Asegúrate de tener el archivo <code className="bg-background px-1 rounded">firebase-applet-config.json</code>
                        en la raíz del proyecto antes de ejecutar el script.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MigracionSupabase;
