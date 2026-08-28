import { createClient } from '@supabase/supabase-js';

// Anon key only — Scroll Trivia guests must use /api/trivia/* for reads/writes.
// Do not add service role or host secrets here.
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';
const anon =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.EXPO_PUBLIC_SUPABASE_KEY ||
  '';

export const supabaseConfigured = Boolean(url && anon);

export const supabase = supabaseConfigured
  ? createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
