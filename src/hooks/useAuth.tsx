'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  username: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUsername: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  setUsername: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Supabase user'dan profil bilgisini çek
async function fetchProfile(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();
  return data?.username || null;
}

// Supabase user → AuthUser dönüşümü
async function toAuthUser(user: User): Promise<AuthUser> {
  const username = await fetchProfile(user.id);
  return {
    id: user.id,
    username,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth state değişikliklerini dinle
  // Supabase resmi önerisi: önce onAuthStateChange kur, sonra getSession çağır
  // Bu sıralama lock çatışmasını (AbortError) önler
  useEffect(() => {
    let mounted = true;

    // 1. Önce subscription kur — INITIAL_SESSION dahil tüm event'leri yakala
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session?.user) {
          const authUser = await toAuthUser(session.user);
          if (mounted) {
            setUser(authUser);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
        }
      }
    );

    // 2. Sonra mevcut session'ı kontrol et (INITIAL_SESSION event'i tetiklenmezse fallback)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (!session) {
        setLoading(false);
      }
      // session varsa INITIAL_SESSION veya SIGNED_IN event'i zaten user'ı set edecek
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
  }, []);

  const handleSetUsername = useCallback(async (username: string) => {
    if (!user) throw new Error('Not logged in');

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, username });

    if (error) throw error;

    setUser((prev) => prev ? { ...prev, username } : null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut: handleSignOut,
        setUsername: handleSetUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
