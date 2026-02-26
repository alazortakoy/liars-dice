'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isReady: authReady } = useRequireAuth();
  const roomCode = (params.code as string)?.toUpperCase() || '------';

  const [isReady, setIsReady] = useState(false);

  // TODO: Faz 4'te gerçek oyuncu verileri Realtime'dan gelecek
  const mockPlayers = [
    { id: user?.id || '1', username: user?.username || 'You', isReady: isReady, isHost: true },
  ];

  function handleToggleReady() {
    setIsReady(!isReady);
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      showToast('Room code copied!');
    });
  }

  function handleLeaveRoom() {
    router.push('/lobby');
  }

  function handleStartGame() {
    // TODO: Faz 4'te Realtime ile oyun başlatma
    router.push(`/game/${roomCode}`);
  }

  const allReady = mockPlayers.every((p) => p.isReady);
  const isHost = true; // TODO: Gerçek host kontrolü

  if (!authReady) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[500px] animate-fade-in">
        {/* Oda başlığı */}
        <div className="text-center mb-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-gold-light mb-3">
            Waiting Room
          </h2>
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-2 bg-pirate-bg-medium border border-dashed border-gold-dark rounded-[10px] px-5 py-2.5 text-2xl font-bold tracking-[4px] text-gold-light cursor-pointer hover:border-gold hover:shadow-[0_0_20px_rgba(212,160,23,0.15)] transition-all"
          >
            {roomCode}
            <span className="text-sm">📋</span>
          </button>
          <p className="text-text-muted text-xs mt-2">Tap to copy room code</p>
        </div>

        {/* Oda ayarları */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <Badge variant="gold">5 Dice</Badge>
          <Badge variant="gold">Joker: ON</Badge>
          <Badge variant="gold">30s Timer</Badge>
          <Badge variant="gold">Max 6 Players</Badge>
        </div>

        {/* Oyuncu listesi */}
        <div className="flex flex-col gap-2 mb-6">
          {mockPlayers.map((player) => (
            <Card key={player.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                {player.isHost && <span className="text-xs">👑</span>}
                <span>{player.username}</span>
              </div>
              <Badge variant={player.isReady ? 'green' : 'red'}>
                {player.isReady ? 'Ready' : 'Not Ready'}
              </Badge>
            </Card>
          ))}

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="border border-dashed border-border-pirate rounded-[10px] p-3 text-center text-text-muted text-sm"
            >
              Waiting for player...
            </div>
          ))}
        </div>

        {/* Aksiyonlar */}
        <div className="flex flex-col gap-2">
          <Button
            fullWidth
            variant={isReady ? 'secondary' : 'primary'}
            onClick={handleToggleReady}
          >
            {isReady ? '✅ Ready!' : '⚔️ Ready Up'}
          </Button>

          {isHost && (
            <Button
              fullWidth
              variant="primary"
              disabled={!allReady || mockPlayers.length < 2}
              onClick={handleStartGame}
            >
              🏴‍☠️ Start Game
            </Button>
          )}

          <Button fullWidth variant="ghost" onClick={handleLeaveRoom}>
            Leave Room
          </Button>
        </div>
      </div>
    </main>
  );
}
