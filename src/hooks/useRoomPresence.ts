'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { leaveRoom } from '@/lib/room-service';

// Bekleme odası Presence hook'u
// Tarayıcı kapanınca 30sn timeout → oyuncuyu odadan sil
// F5 yapılırsa 30sn içinde rejoin → hiçbir şey olmaz
const ROOM_DISCONNECT_TIMEOUT = 30_000; // 30 saniye

export function useRoomPresence(
  roomId: string | undefined,
  userId: string | undefined,
  username: string | undefined,
  hostId: string | undefined
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const disconnectTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Disconnect olan oyuncuyu odadan sil
  const handlePlayerDisconnect = useCallback(async (playerId: string) => {
    if (!roomId || !hostId) return;
    try {
      await leaveRoom(roomId, playerId, hostId);
    } catch {
      // Oyuncu zaten silinmiş olabilir, hata yut
    }
  }, [roomId, hostId]);

  useEffect(() => {
    if (!roomId || !userId) return;

    const channel = supabase.channel(`room-presence:${roomId}`, {
      config: { presence: { key: userId } },
    });

    // Presence leave: oyuncu ayrıldı → 30sn timeout başlat
    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (key && key !== userId && !disconnectTimers.current.has(key)) {
        const timer = setTimeout(() => {
          disconnectTimers.current.delete(key);
          handlePlayerDisconnect(key);
        }, ROOM_DISCONNECT_TIMEOUT);
        disconnectTimers.current.set(key, timer);
      }
    });

    // Presence join: oyuncu geri döndü → timeout iptal
    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key && disconnectTimers.current.has(key)) {
        clearTimeout(disconnectTimers.current.get(key));
        disconnectTimers.current.delete(key);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ username: username || 'Unknown' });
      }
    });

    channelRef.current = channel;

    // Tab/tarayıcı kapanınca Presence'dan hemen çık
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.untrack();
      }
    };

    // Sekme tekrar görünür olunca re-track
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && channelRef.current && userId) {
        channelRef.current.track({ username: username || 'Unknown' });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Tüm disconnect timer'larını temizle
      for (const timer of disconnectTimers.current.values()) {
        clearTimeout(timer);
      }
      disconnectTimers.current.clear();

      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, userId, username, handlePlayerDisconnect]);
}
