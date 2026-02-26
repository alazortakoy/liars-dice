'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState('');

  async function handleGuestLogin() {
    setLoading(true);
    try {
      // TODO: Faz 2'de Supabase anonim giriş
      setShowUsernameModal(true);
    } catch {
      showToast('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    // TODO: Faz 2'de Supabase Google OAuth
    showToast('Google login coming soon!');
  }

  async function handleUsernameSubmit() {
    const trimmed = username.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      showToast('Username must be 2-20 characters.');
      return;
    }

    // TODO: Faz 2'de Supabase profiles tablosuna kaydet
    localStorage.setItem('liars-dice-username', trimmed);
    setShowUsernameModal(false);
    router.push('/lobby');
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] text-center animate-fade-in">
        {/* Logo */}
        <div className="text-6xl mb-2">🏴‍☠️</div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-gold-light mb-1">
          Liar&apos;s Dice
        </h1>
        <p className="text-text-muted text-sm italic mb-12">
          &ldquo;Dead Man&apos;s Chest&rdquo;
        </p>

        {/* Login butonları */}
        <div className="flex flex-col gap-4">
          <Button
            fullWidth
            onClick={handleGuestLogin}
            loading={loading}
          >
            ⚓ Play as Guest
          </Button>

          <div className="flex items-center gap-4 text-text-muted text-xs">
            <span className="flex-1 h-px bg-border-pirate" />
            or
            <span className="flex-1 h-px bg-border-pirate" />
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </Button>
        </div>

        <p className="text-text-muted text-xs mt-8">
          Play with 2-8 friends. No download needed.
        </p>
      </div>

      {/* Username Modal */}
      <Modal open={showUsernameModal}>
        <h3 className="font-[family-name:var(--font-display)] text-xl text-gold-light text-center mb-4">
          Choose Your Name
        </h3>
        <Input
          placeholder="Captain Jack..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUsernameSubmit()}
          maxLength={20}
          autoFocus
        />
        <p className="text-text-muted text-xs mt-2 mb-4">2-20 characters</p>
        <Button fullWidth onClick={handleUsernameSubmit}>
          Set Sail! ⛵
        </Button>
      </Modal>
    </main>
  );
}
