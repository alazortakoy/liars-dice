'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { fetchRoom, fetchRoomPlayers, leaveRoom, toggleReady, startGame, addBot, removeBot, kickPlayer, type RoomRow, type RoomPlayerRow } from '@/lib/room-service';
import { supabase } from '@/lib/supabase';
import { generateBotId, getAvailableBotName } from '@/lib/bot-engine';
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Otomatik başlama: tüm oyuncular ready olunca 3sn geri sayım
  const allReadyForStart = players.length >= 2 && players.every((p) => p.is_ready);
  const isHost = room?.host_id === user?.id;

  useEffect(() => {
    if (allReadyForStart && isHost) {
      // 3sn geri sayım başlat
      setCountdown(3);
      let remaining = 3;
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          // Otomatik oyun başlat
          if (room) {
            startGame(room.id, user!.id).catch((err: unknown) => {
              const msg = err instanceof Error ? err.message : 'Failed to start game';
              showToast(msg);
            });
          }
        }
      }, 1000);
    } else {
      // Ready değilse countdown iptal
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(null);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [allReadyForStart, isHost, room, user, showToast]);

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
          fetchRoomPlayers(room.id).then((updatedPlayers) => {
            setPlayers(updatedPlayers);
            // Kick detection: ben artık listede yoksam lobby'ye yönlendir
            if (user && !updatedPlayers.some((p) => p.player_id === user.id)) {
              showToast('You were removed from the room');
              router.push('/lobby');
            }
          });
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
            const updated = payload.new as RoomRow;
            setRoom(updated);
            // Oyun başladıysa tüm oyuncuları game sayfasına yönlendir
            if (updated.status === 'playing') {
              router.push(`/game/${roomCode}`);
            }
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
  async function handleStartGame() {
    if (!room || !user) return;
    try {
      await startGame(room.id, user.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start game';
      showToast(msg);
    }
  }

  // Bot ekle (sadece host)
  async function handleAddBot() {
    if (!room || !user) return;
    const maxP = (room.settings as RoomSettings).maxPlayers || 6;
    if (players.length >= maxP) {
      showToast('Room is full');
      return;
    }
    try {
      const usedNames = players.map((p) => p.username);
      const botName = getAvailableBotName(usedNames);
      const botId = generateBotId();
      await addBot(room.id, botId, botName);
    } catch {
      showToast('Failed to add bot');
    }
  }

  // Bot çıkar
  async function handleRemoveBot(botPlayerId: string) {
    if (!room) return;
    try {
      await removeBot(room.id, botPlayerId);
    } catch {
      showToast('Failed to remove bot');
    }
  }

  // Oyuncu kick et (sadece host)
  async function handleKickPlayer(playerId: string) {
    if (!room || !user) return;
    try {
      await kickPlayer(room.id, playerId);
      showToast('Player kicked');
    } catch {
      showToast('Failed to kick player');
    }
  }

  if (!authReady || roomLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
      </main>
    );
  }

  const settings = (room?.settings || {}) as RoomSettings;
  const myPlayer = players.find((p) => p.player_id === user?.id);
  const isReady = myPlayer?.is_ready ?? false;
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
                {player.is_bot && <Badge variant="gold">BOT</Badge>}
                {player.player_id === user?.id && (
                  <span className="text-text-muted text-xs">(you)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={player.is_ready ? 'green' : 'red'}>
                  {player.is_ready ? 'Ready' : 'Not Ready'}
                </Badge>
                {/* Host: kick/remove butonları */}
                {isHost && player.player_id !== user?.id && (
                  player.is_bot ? (
                    <button
                      onClick={() => handleRemoveBot(player.player_id)}
                      className="text-pirate-red-light text-xs hover:underline"
                      title="Remove bot"
                    >
                      ✕
                    </button>
                  ) : (
                    <button
                      onClick={() => handleKickPlayer(player.player_id)}
                      className="text-pirate-red-light text-xs hover:underline"
                      title="Kick player"
                    >
                      Kick
                    </button>
                  )
                )}
              </div>
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

          {/* Countdown gösterimi */}
          {countdown !== null && (
            <div className="text-center py-2 text-gold-light font-bold text-lg animate-fade-in">
              Game starting in {countdown}...
            </div>
          )}

          {isHost && countdown === null && (
            <Button
              fullWidth
              variant="primary"
              disabled={!allReadyForStart}
              onClick={handleStartGame}
            >
              🏴‍☠️ Start Game
            </Button>
          )}

          {isHost && players.length < (settings.maxPlayers || 6) && (
            <Button fullWidth variant="secondary" onClick={handleAddBot}>
              🤖 Add Bot
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
