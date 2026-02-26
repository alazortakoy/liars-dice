'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { APP_CONFIG } from '@/lib/config';

export default function LobbyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('liars-dice-username');
    if (!stored) {
      router.push('/');
      return;
    }
    setUsername(stored);
  }, [router]);

  function handleCreateRoom() {
    // TODO: Faz 3'te Supabase ile oda oluştur
    showToast('Room creation coming soon!');
  }

  function handleJoinByCode() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== APP_CONFIG.roomCodeLength) {
      showToast(`Enter a ${APP_CONFIG.roomCodeLength}-character room code.`);
      return;
    }
    // TODO: Faz 3'te Supabase ile odaya katıl
    router.push(`/room/${code}`);
  }

  function handleLogout() {
    localStorage.removeItem('liars-dice-username');
    router.push('/');
  }

  return (
    <main className="min-h-dvh flex flex-col items-center p-4 pt-6">
      <div className="w-full max-w-[600px] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-gold-light">
            🏴‍☠️ Lobby
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-text-secondary text-sm">{username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Oda oluştur + kodla katıl */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button fullWidth onClick={handleCreateRoom}>
            + Create Room
          </Button>
        </div>

        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Room code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            maxLength={APP_CONFIG.roomCodeLength}
            className="uppercase tracking-widest text-center text-lg"
          />
          <Button variant="secondary" onClick={handleJoinByCode}>
            Join
          </Button>
        </div>

        {/* Oda listesi */}
        <h3 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-3">
          Open Rooms
        </h3>

        <div className="flex flex-col gap-2">
          {/* TODO: Faz 3'te Supabase'den odalar çekilecek */}
          <div className="text-center py-12 text-text-muted">
            <p className="text-lg mb-1">No open rooms yet.</p>
            <p className="text-sm">Create a room or join with a code!</p>
          </div>

          {/* Örnek oda kartı (görsel referans, sonra silinecek) */}
          <Card className="flex items-center justify-between cursor-pointer hover:border-gold-dark hover:shadow-[0_0_20px_rgba(212,160,23,0.15)] transition-all hidden">
            <div>
              <h4 className="text-text-primary font-medium">Captain&apos;s Table</h4>
              <p className="text-text-muted text-xs mt-0.5">Host: BlackBeard</p>
            </div>
            <div className="text-right">
              <Badge variant="green">3/6</Badge>
              <p className="text-text-muted text-xs mt-1">Waiting</p>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
