import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// No-op lock — navigator.locks API'sini devre dışı bırak
// Bu, AbortError "Lock broken by another request with the 'steal' option" hatasını önler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function noopLock(_name: string, _acquireTimeout: number, fn: () => Promise<any>) {
  return await fn();
}

// Singleton Supabase client
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'liars-dice-auth',
      // navigator.locks çatışmasını önle
      lock: noopLock as never,
    },
  });

  return _supabase;
}

export const supabase = getSupabaseClient();
