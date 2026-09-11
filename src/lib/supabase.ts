import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://jfatbjaxgpheqkqnhyvd.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYXRiamF4Z3BoZXFrcW5oeXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMTc0MjQsImV4cCI6MjEwNDY5MzQyNH0.aEqCdpFMG2R8ewam57JwZIApR_WRUl3WDkDdqC_uT-k';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

// Real client (or dummy instance if credentials not yet configured)
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key'
);
