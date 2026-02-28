'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { RealtimeEvent } from '@/types';
import { APP_CONFIG } from '@/lib/config';

interface UseGameChannelReturn {
  sendEvent: (event: RealtimeEvent) => void;
  isConnected: boolean;
  onlinePlayers: Set<string>;
}

// Supabase Realtime Broadcast + Presence kanalı yönetimi
export function useGameChannel(
  roomCode: string,
  onEvent: (event: RealtimeEvent) => void,
  userId?: string,
  username?: string
): UseGameChannelReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());

  // Disconnect timeout takibi
  const disconnectTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`game:${roomCode}`, {
      config: { broadcast: { self: true }, presence: { key: userId || 'anon' } },
    });

    // Broadcast event'lerini dinle
    channel.on('broadcast', { event: 'game-event' }, (payload) => {
      const event = payload.payload as RealtimeEvent;
      onEventRef.current(event);
    });

    // Presence: oyuncu online/offline takibi
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const online = new Set<string>();
      for (const key of Object.keys(state)) {
        online.add(key);
      }
      setOnlinePlayers(online);
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      // Oyuncu ayrıldı — 30sn bekle, sonra disconnect bildir
      if (key && !disconnectTimers.current.has(key)) {
        const timer = setTimeout(() => {
          disconnectTimers.current.delete(key);
          // Disconnect event'i gönder
          onEventRef.current({
            type: 'player:disconnected',
            payload: { playerId: key },
          });
        }, APP_CONFIG.disconnectTimeout);
        disconnectTimers.current.set(key, timer);
      }
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      // Oyuncu geri döndü — disconnect timer'ı iptal et
      if (key && disconnectTimers.current.has(key)) {
        clearTimeout(disconnectTimers.current.get(key));
        disconnectTimers.current.delete(key);
      }
    });

    channel.subscribe(async (status) => {
      connectedRef.current = status === 'SUBSCRIBED';
      if (status === 'SUBSCRIBED' && userId) {
        // Presence'a kendimizi ekle
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

    // Sekme arka plana geçince de bildir (mobil tarayıcılar için)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && channelRef.current) {
        // Arka plana geçti — untrack yapma (sayfa yenileme olabilir)
        // Sadece visible'a dönünce re-track yap
      } else if (document.visibilityState === 'visible' && channelRef.current && userId) {
        // Tekrar görünür oldu — Presence'ı yenile
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
      connectedRef.current = false;
    };
  }, [roomCode, userId, username]);

  const sendEvent = useCallback((event: RealtimeEvent) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'game-event',
      payload: event,
    });
  }, []);

  return {
    sendEvent,
    isConnected: connectedRef.current,
    onlinePlayers,
  };
}
