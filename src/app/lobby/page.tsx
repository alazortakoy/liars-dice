'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { APP_CONFIG } from '@/lib/config';
import CreateRoomModal from '@/components/CreateRoomModal';
import { createRoom, joinRoom, fetchOpenRooms, type RoomWithPlayerCount } from '@/lib/room-service';
import { supabase } from '@/lib/supabase';
import type { RoomSettings } from '@/types';

export default function LobbyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, loading, signOut } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rooms, setRooms] = useState<RoomWithPlayerCount[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);

  // Auth koruması
  useEffect(() => {
    if (!loading && (!user || !user.username)) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Odaları yükle
  const loadRooms = useCallback(async () => {
    try {
      const data = await fetchOpenRooms();
      setRooms(data);
    } catch {
      // Sessizce başarısız — ilk yüklemede tablo yoksa hata verebilir
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Realtime: rooms tablosu değişikliklerini dinle
  useEffect(() => {
    const channel = supabase
      .channel('lobby-rooms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          // Herhangi bir değişiklikte listeyi yenile
          loadRooms();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players' },
        () => {
          // Oyuncu değişikliklerinde de yenile (sayı güncellenmesi için)
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRooms]);

  // Oda oluştur
  async function handleCreateRoom(settings: RoomSettings) {
    if (!user) return;
    try {
      const room = await createRoom(user.id, user.username!, settings);
      setShowCreateModal(false);
      router.push(`/room/${room.code}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create room';
      showToast(msg);
    }
  }

  // Kodla katıl
  async function handleJoinByCode() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== APP_CONFIG.roomCodeLength) {
      showToast(`Enter a ${APP_CONFIG.roomCodeLength}-character room code.`);
      return;
    }
    if (!user) return;

    setJoinLoading(true);
    try {
      await joinRoom(code, user.id, user.username!);
      router.push(`/room/${code}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join room';
      showToast(msg);
    } finally {
      setJoinLoading(false);
    }
  }

  // Oda kartına tıklayarak katıl
  async function handleJoinRoom(room: RoomWithPlayerCount) {
    if (!user) return;

    try {
      await joinRoom(room.code, user.id, user.username!);
      router.push(`/room/${room.code}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join room';
      showToast(msg);
    }
  }

  async function handleLogout() {
    await signOut();
    router.push('/');
  }

  if (loading || !user?.username) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
      </main>
    );
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
            <span className="text-text-secondary text-sm">{user.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Oda oluştur */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button fullWidth onClick={() => setShowCreateModal(true)}>
            + Create Room
          </Button>
        </div>

        {/* Kodla katıl */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Room code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
            maxLength={APP_CONFIG.roomCodeLength}
            className="uppercase tracking-widest text-center text-lg"
          />
          <Button variant="secondary" onClick={handleJoinByCode} loading={joinLoading}>
            Join
          </Button>
        </div>

        {/* Oda listesi */}
        <h3 className="text-text-muted text-sm font-semibold uppercase tracking-wider mb-3">
          Open Rooms
        </h3>

        <div className="flex flex-col gap-2">
          {roomsLoading ? (
            <div className="text-center py-12">
              <div className="w-6 h-6 border-2 border-border-pirate border-t-gold rounded-full animate-spin mx-auto" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-lg mb-1">No open rooms yet.</p>
              <p className="text-sm">Create a room or join with a code!</p>
            </div>
          ) : (
            rooms.map((room) => {
              const settings = room.settings;
              const isFull = room.player_count >= settings.maxPlayers;

              return (
                <Card
                  key={room.id}
                  className={`flex items-center justify-between transition-all ${
                    isFull
                      ? 'opacity-60'
                      : 'cursor-pointer hover:border-gold-dark hover:shadow-[0_0_20px_rgba(212,160,23,0.15)]'
                  }`}
                  onClick={() => !isFull && handleJoinRoom(room)}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-text-primary font-medium">{room.code}</h4>
                      <div className="flex gap-1">
                        {settings.jokerRule && <Badge variant="gold">Joker</Badge>}
                        <Badge variant="gold">{settings.startingDice}d</Badge>
                      </div>
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">Host: {room.host_username}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={isFull ? 'red' : 'green'}>
                      {room.player_count}/{settings.maxPlayers}
                    </Badge>
                    <p className="text-text-muted text-xs mt-1">
                      {isFull ? 'Full' : 'Waiting'}
                    </p>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Oda oluşturma modal */}
      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />
    </main>
  );
}
