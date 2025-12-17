import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://kjzafzuhpfvtyxlgssto.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqemFmenVocGZ2dHl4bGdzc3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjE2MDQsImV4cCI6MjA4MDI5NzYwNH0.lnLS8KNU23f_Y28d0Hz3mvaBhe2w6ScJlRPkJCsvhVI';

// Eliminamos las restricciones de sesión para que el SDK de Supabase gestione correctamente
// los encabezados de autorización (JWT) en cada petición a la base de datos.
export const supabase = createClient(supabaseUrl, supabaseKey);