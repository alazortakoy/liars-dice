'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

// Giriş yapmamış kullanıcıyı login'e yönlendirir
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.username)) {
      router.push('/');
    }
  }, [user, loading, router]);

  return { user, loading, isReady: !loading && !!user?.username };
}
