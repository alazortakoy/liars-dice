'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { fetchRoom, fetchRoomPlayers, leaveRoom, toggleReady, type RoomRow, type RoomPlayerRow } from '@/lib/room-service';
import { supabase } from '@/lib/supabase';
import type { RoomSettings } from '@/types';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isReady: authReady } = useRequireAuth();
  const roomCode = (params.code as string)?.toUpperCase() || '------';

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [roomLoading, setRoomLoading] = useState(true);

  // Oda ve oyuncu verilerini yükle
  const loadRoomData = useCallback(async () => {
    const roomData = await fetchRoom(roomCode);
    if (!roomData) {
      showToast('Room not found');
      router.push('/lobby');
      return;
    }
    setRoom(roomData);

    const playersData = await fetchRoomPlayers(roomData.id);
    setPlayers(playersData);
    setRoomLoading(false);
  }, [roomCode, router, showToast]);

  useEffect(() => {
    if (authReady) {
      loadRoomData();
    }
  }, [authReady, loadRoomData]);

  // Realtime: room_players değişikliklerini dinle
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room.id}` },
        () => {
          // Oyuncu listesini yenile
          fetchRoomPlayers(room.id).then(setPlayers);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            // Oda silindi (host ayrıldı)
            showToast('Room was closed by the host');
            router.push('/lobby');
          } else if (payload.eventType === 'UPDATE') {
            // Oda güncellendi
            setRoom(payload.new as RoomRow);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room, router, showToast]);

  // Ready durumunu değiştir
  async function handleToggleReady() {
    if (!room || !user) return;
    const myPlayer = players.find((p) => p.player_id === user.id);
    if (!myPlayer) return;

    try {
      await toggleReady(room.id, user.id, !myPlayer.is_ready);
    } catch {
      showToast('Failed to update ready status');
    }
  }

  // Oda kodunu kopyala
  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      showToast('Room code copied!');
    });
  }

  // Odadan ayrıl
  async function handleLeaveRoom() {
    if (!room || !user) return;
    try {
      await leaveRoom(room.id, user.id, room.host_id);
      router.push('/lobby');
    } catch {
      showToast('Failed to leave room');
    }
  }

  // Oyunu başlat (sadece host)
  function handleStartGame() {
    if (!room) return;
    // TODO: Faz 4'te game_state oluşturma + Realtime ile oyun başlatma
    router.push(`/game/${roomCode}`);
  }

  if (!authReady || roomLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
      </main>
    );
  }

  const settings = (room?.settings || {}) as RoomSettings;
  const isHost = room?.host_id === user?.id;
  const myPlayer = players.find((p) => p.player_id === user?.id);
  const isReady = myPlayer?.is_ready ?? false;
  const allReady = players.length >= 2 && players.every((p) => p.is_ready);
  const emptySlots = Math.max(0, (settings.maxPlayers || 6) - players.length);

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
          <Badge variant="gold">{settings.startingDice || 5} Dice</Badge>
          <Badge variant="gold">Joker: {settings.jokerRule ? 'ON' : 'OFF'}</Badge>
          <Badge variant="gold">{settings.turnTimer === 0 ? 'No Timer' : `${settings.turnTimer || 30}s`}</Badge>
          <Badge variant="gold">Max {settings.maxPlayers || 6} Players</Badge>
        </div>

        {/* Oyuncu listesi */}
        <div className="flex flex-col gap-2 mb-6">
          {players.map((player) => (
            <Card key={player.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                {player.player_id === room?.host_id && <span className="text-xs">👑</span>}
                <span>{player.username}</span>
                {player.player_id === user?.id && (
                  <span className="text-text-muted text-xs">(you)</span>
                )}
              </div>
              <Badge variant={player.is_ready ? 'green' : 'red'}>
                {player.is_ready ? 'Ready' : 'Not Ready'}
              </Badge>
            </Card>
          ))}

          {Array.from({ length: emptySlots }).map((_, i) => (
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
              disabled={!allReady}
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
