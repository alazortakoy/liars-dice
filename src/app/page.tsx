'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading: authLoading, signInAnonymously, signInWithEmail, signUpWithEmail, setUsername: saveUsername } = useAuth();
  const [guestLoading, setGuestLoading] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameLoading, setUsernameLoading] = useState(false);

  // Email login state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  // Zaten giriş yapmış ve username'i varsa lobby'ye yönlendir
  useEffect(() => {
    if (!authLoading && user?.username) {
      router.push('/lobby');
    }
    // Giriş yapmış ama username'i yoksa modal aç
    if (!authLoading && user && !user.username) {
      setShowUsernameModal(true);
    }
  }, [user, authLoading, router]);

  async function handleGuestLogin() {
    setGuestLoading(true);
    try {
      await signInAnonymously();
    } catch {
      showToast('Login failed. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleEmailSubmit() {
    if (!email || !password) {
      showToast('Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }

    setEmailLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        showToast('Account created! You can now log in.');
        setIsSignUp(false);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('Invalid login')) {
        showToast('Invalid email or password.');
      } else if (msg.includes('already registered')) {
        showToast('Email already registered. Try logging in.');
      } else {
        showToast(msg);
      }
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleUsernameSubmit() {
    const trimmed = username.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      showToast('Username must be 2-20 characters.');
      return;
    }

    setUsernameLoading(true);
    try {
      await saveUsername(trimmed);
      setShowUsernameModal(false);
      router.push('/lobby');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('23505') || msg.includes('unique')) {
        showToast('Username already taken. Try another.');
      } else {
        showToast('Failed to set username. Try again.');
      }
    } finally {
      setUsernameLoading(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
      </main>
    );
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

        <div className="flex flex-col gap-4">
          {/* Guest giriş */}
          <Button
            fullWidth
            onClick={handleGuestLogin}
            loading={guestLoading}
          >
            ⚓ Play as Guest
          </Button>

          <div className="flex items-center gap-4 text-text-muted text-xs">
            <span className="flex-1 h-px bg-border-pirate" />
            or
            <span className="flex-1 h-px bg-border-pirate" />
          </div>

          {/* Email login/signup */}
          {!showEmailForm ? (
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setShowEmailForm(true)}
            >
              ✉️ Sign in with Email
            </Button>
          ) : (
            <div className="flex flex-col gap-3 animate-fade-in">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              <Input
                type="password"
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
              />
              <Button fullWidth onClick={handleEmailSubmit} loading={emailLoading}>
                {isSignUp ? 'Create Account' : 'Log In'}
              </Button>
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-text-muted text-xs hover:text-gold transition-colors"
              >
                {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
              </button>
            </div>
          )}
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
        <Button fullWidth onClick={handleUsernameSubmit} loading={usernameLoading}>
          Set Sail! ⛵
        </Button>
      </Modal>
    </main>
  );
}
