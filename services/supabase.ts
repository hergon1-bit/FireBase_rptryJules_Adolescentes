
import { createClient } from '@supabase/supabase-js';

// URL del proyecto Supabase basado en el ID kjzafzuhpfvtyxlgssto
export const supabaseUrl = 'https://kjzafzuhpfvtyxlgssto.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqemFmenVocGZ2dHl4bGdzc3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjE2MDQsImV4cCI6MjA4MDI5NzYwNH0.lnLS8KNU23f_Y28d0Hz3mvaBhe2w6ScJlRPkJCsvhVI';

// Cliente configurado para comunicación HTTPS (PostgREST)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'apikey': supabaseKey,
    },
  },
  db: {
    schema: 'public'
  }
});
