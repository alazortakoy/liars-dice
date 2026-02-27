import { supabase } from './supabase';
import type { ChatMessage } from '@/types';

// DB'den dönen chat_messages satırı
interface ChatMessageRow {
  id: string;
  room_id: string;
  player_id: string;
  username: string;
  message: string;
  is_system: boolean;
  created_at: string;
}

// Row → ChatMessage dönüşümü
function rowToMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    playerId: row.player_id,
    username: row.username,
    message: row.message,
    isSystem: row.is_system,
    createdAt: row.created_at,
  };
}

// Chat mesajı gönder (DB'ye yaz)
export async function sendChatMessage(
  roomId: string,
  playerId: string,
  username: string,
  message: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      player_id: playerId,
      username,
      message: message.slice(0, 200),
      is_system: false,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToMessage(data as ChatMessageRow);
}

// Sistem mesajı gönder (host çağırır)
export async function sendSystemMessage(
  roomId: string,
  hostId: string,
  message: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      player_id: hostId,
      username: 'System',
      message,
      is_system: true,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToMessage(data as ChatMessageRow);
}

// Son mesajları getir (sayfa yüklendiğinde)
export async function fetchChatHistory(
  roomId: string,
  limit: number = 50
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  // Ters çevir: eski → yeni sıralama
  return (data as ChatMessageRow[]).reverse().map(rowToMessage);
}
