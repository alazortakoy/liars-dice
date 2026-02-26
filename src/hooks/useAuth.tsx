'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  username: string | null;
  isAnonymous: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  setUsername: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInAnonymously: async () => {},
  signInWithGoogle: async () => {},
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
    isAnonymous: user.is_anonymous ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Oturum değişikliklerini dinle
  useEffect(() => {
    // Mevcut oturumu kontrol et
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const authUser = await toAuthUser(session.user);
        setUser(authUser);
      }
      setLoading(false);
    });

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const authUser = await toAuthUser(session.user);
          setUser(authUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = useCallback(async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/lobby',
      },
    });
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
        signInAnonymously,
        signInWithGoogle,
        signOut: handleSignOut,
        setUsername: handleSetUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
