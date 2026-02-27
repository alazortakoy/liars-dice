'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { RealtimeEvent } from '@/types';

interface UseGameChannelReturn {
  sendEvent: (event: RealtimeEvent) => void;
  isConnected: boolean;
}

// Supabase Realtime Broadcast kanalı yönetimi
export function useGameChannel(
  roomCode: string,
  onEvent: (event: RealtimeEvent) => void
): UseGameChannelReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectedRef = useRef(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`game:${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    // Tüm oyun event'lerini dinle
    channel.on('broadcast', { event: 'game-event' }, (payload) => {
      const event = payload.payload as RealtimeEvent;
      onEventRef.current(event);
    });

    channel.subscribe((status) => {
      connectedRef.current = status === 'SUBSCRIBED';
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      connectedRef.current = false;
    };
  }, [roomCode]);

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
  };
}
