import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const hasEnv = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasEnv) {
  // eslint-disable-next-line no-console
  console.warn('Supabase: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

/**
 * Supabase client for auth and data access.
 * When .env is missing, uses a placeholder URL so the app loads; auth calls will fail with a clear error.
 */
export const supabase = hasEnv
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
