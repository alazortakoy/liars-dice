import { createClient } from '@supabase/supabase-js';

// TODO: .env.local dosyasından okunacak
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const isConfigured = supabaseUrl !== 'https://YOUR_PROJECT.supabase.co';

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function getSupabase() {
  if (!supabase) {
    console.warn('⚠️ Supabase henüz yapılandırılmadı. .env.local dosyasını güncelle.');
  }
  return supabase;
}

export { isConfigured };
