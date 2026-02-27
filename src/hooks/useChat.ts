'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchChatHistory, sendChatMessage, sendSystemMessage } from '@/lib/chat-service';
import { APP_CONFIG } from '@/lib/config';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage } from '@/types';

interface UseChatReturn {
  messages: ChatMessage[];
  unreadCount: number;
  sendMessage: (text: string) => void;
  sendSystemMsg: (text: string) => void;
  clearUnread: () => void;
}

// Chat hook: Realtime broadcast + DB persistence
export function useChat(
  roomCode: string,
  roomId: string | null,
  userId?: string,
  username?: string
): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isChatOpenRef = useRef(false);

  // DB'den geçmişi yükle
  useEffect(() => {
    if (!roomId) return;

    fetchChatHistory(roomId).then((history) => {
      setMessages(history);
    }).catch(() => {
      // Tablo yoksa veya hata varsa sessizce geç
    });
  }, [roomId]);

  // Realtime kanalına bağlan (aynı game kanalı, farklı event)
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`chat:${roomCode}`, {
      config: { broadcast: { self: true } },
    });

    channel.on('broadcast', { event: 'chat-message' }, (payload) => {
      const msg = payload.payload as ChatMessage;
      setMessages((prev) => [...prev, msg]);

      // Chat kapalıysa unread artır
      if (!isChatOpenRef.current) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomCode]);

  // Mesaj gönder
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !roomId || !userId || !username) return;
      if (trimmed.length > APP_CONFIG.maxChatMessageLength) return;

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        roomId,
        playerId: userId,
        username,
        message: trimmed,
        isSystem: false,
        createdAt: new Date().toISOString(),
      };

      // Broadcast ile anlık ilet
      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: msg,
      });

      // DB'ye kalıcı kaydet (arka planda)
      sendChatMessage(roomId, userId, username, trimmed).catch(() => {
        // DB hatası broadcast'i engellemez
      });
    },
    [roomId, userId, username]
  );

  // Sistem mesajı gönder (sadece host çağırır)
  const sendSystemMsg = useCallback(
    (text: string) => {
      if (!roomId || !userId) return;

      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        roomId,
        playerId: userId,
        username: 'System',
        message: text,
        isSystem: true,
        createdAt: new Date().toISOString(),
      };

      // Broadcast ile anlık ilet
      channelRef.current?.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: msg,
      });

      // DB'ye kaydet (arka planda)
      sendSystemMessage(roomId, userId, text).catch(() => {});
    },
    [roomId, userId]
  );

  // Unread sayacını sıfırla
  const clearUnread = useCallback(() => {
    isChatOpenRef.current = true;
    setUnreadCount(0);
  }, []);

  // Chat kapandığında ref'i güncelle (clearUnread çağrılmadığında)
  // Bu dışarıdan chatOpen state'i ile yönetilir
  // clearUnread = chat açıldı, setChatClosed aşağıda
  const setChatClosedOnUnmount = useCallback(() => {
    isChatOpenRef.current = false;
  }, []);

  // Component unmount'ta chat'i kapalı say
  useEffect(() => {
    return () => {
      setChatClosedOnUnmount();
    };
  }, [setChatClosedOnUnmount]);

  return { messages, unreadCount, sendMessage, sendSystemMsg, clearUnread };
}
