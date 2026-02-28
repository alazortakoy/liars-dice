import { supabase } from './supabase';
import { generateRoomCode } from './game-logic';
import type { RoomSettings } from '@/types';
import { APP_CONFIG } from './config';

// Supabase'den dönen oda tipi
export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  settings: RoomSettings;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
}

// Supabase'den dönen oyuncu tipi
export interface RoomPlayerRow {
  id: string;
  room_id: string;
  player_id: string;
  username: string;
  is_ready: boolean;
  is_bot: boolean;
  joined_at: string;
}

// Lobby'de gösterilecek oda bilgisi (oyuncu sayısı dahil)
export interface RoomWithPlayerCount extends RoomRow {
  player_count: number;
  host_username: string;
}

// Benzersiz oda kodu üret (çakışma kontrolü)
async function generateUniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateRoomCode(APP_CONFIG.roomCodeLength);
    const { data } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', code)
      .single();
    if (!data) return code;
  }
  throw new Error('Failed to generate unique room code');
}

// Oda oluştur + host'u oyuncu olarak ekle
export async function createRoom(
  hostId: string,
  username: string,
  settings: RoomSettings
): Promise<RoomRow> {
  const code = await generateUniqueRoomCode();

  // Oda oluştur
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      code,
      host_id: hostId,
      settings,
    })
    .select()
    .single();

  if (roomError) throw roomError;

  // Host'u oyuncu olarak ekle
  const { error: playerError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      player_id: hostId,
      username,
    });

  if (playerError) {
    // Oda oluşturuldu ama oyuncu eklenemedi — odayı sil
    await supabase.from('rooms').delete().eq('id', room.id);
    throw playerError;
  }

  return room as RoomRow;
}

// Odaya katıl
export async function joinRoom(
  code: string,
  playerId: string,
  username: string
): Promise<RoomRow> {
  // Odayı bul
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (roomError || !room) throw new Error('Room not found');

  if (room.status !== 'waiting') {
    throw new Error('Game already started');
  }

  // Mevcut oyuncu sayısını kontrol et
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id);

  const maxPlayers = (room.settings as RoomSettings).maxPlayers || APP_CONFIG.maxPlayersPerRoom;
  if ((count ?? 0) >= maxPlayers) {
    throw new Error('Room is full');
  }

  // Oyuncuyu ekle
  const { error: joinError } = await supabase
    .from('room_players')
    .insert({
      room_id: room.id,
      player_id: playerId,
      username,
    });

  if (joinError) {
    // Zaten katılmışsa hata vermek yerine mevcut odaya yönlendir
    if (joinError.code === '23505') {
      return room as RoomRow;
    }
    throw joinError;
  }

  return room as RoomRow;
}

// Açık odaları getir (lobby listesi)
export async function fetchOpenRooms(): Promise<RoomWithPlayerCount[]> {
  // Bekleyen odaları çek
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!rooms || rooms.length === 0) return [];

  // Her oda için oyuncu sayısı ve host adı çek
  const roomIds = rooms.map((r) => r.id);
  const { data: players } = await supabase
    .from('room_players')
    .select('room_id, username, player_id')
    .in('room_id', roomIds);

  return rooms.map((room) => {
    const roomPlayers = (players || []).filter((p) => p.room_id === room.id);
    const hostPlayer = roomPlayers.find((p) => p.player_id === room.host_id);
    return {
      ...(room as RoomRow),
      player_count: roomPlayers.length,
      host_username: hostPlayer?.username || 'Unknown',
    };
  });
}

// Oda bilgisini getir
export async function fetchRoom(code: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) return null;
  return data as RoomRow;
}

// Oda oyuncularını getir
export async function fetchRoomPlayers(roomId: string): Promise<RoomPlayerRow[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return (data || []) as RoomPlayerRow[];
}

// Odadan ayrıl
export async function leaveRoom(roomId: string, playerId: string, hostId: string): Promise<void> {
  // Oyuncuyu sil
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  if (error) throw error;

  // Host ayrılıyorsa: başka oyuncu varsa devret, yoksa odayı sil
  if (playerId === hostId) {
    const { data: remaining } = await supabase
      .from('room_players')
      .select('player_id')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
      .limit(1);

    if (remaining && remaining.length > 0) {
      // Host'u sıradaki oyuncuya devret
      await supabase
        .from('rooms')
        .update({ host_id: remaining[0].player_id })
        .eq('id', roomId);
    } else {
      // Kimse kalmadı, odayı sil
      await supabase.from('rooms').delete().eq('id', roomId);
    }
  }
}

// Oyunu başlat (host only) — room status'u 'playing' yap
export async function startGame(roomId: string, hostId: string): Promise<void> {
  // Sadece host başlatabilir
  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single();

  if (!room || room.host_id !== hostId) {
    throw new Error('Only the host can start the game');
  }
  if (room.status !== 'waiting') {
    throw new Error('Game already started');
  }

  // Oyuncu sayısı kontrolü
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);

  if ((count ?? 0) < APP_CONFIG.minPlayersPerRoom) {
    throw new Error(`Need at least ${APP_CONFIG.minPlayersPerRoom} players`);
  }

  // Room status'u güncelle
  const { error } = await supabase
    .from('rooms')
    .update({ status: 'playing' })
    .eq('id', roomId);

  if (error) throw error;
}

// Ready durumunu değiştir
export async function toggleReady(roomId: string, playerId: string, isReady: boolean): Promise<void> {
  const { error } = await supabase
    .from('room_players')
    .update({ is_ready: isReady })
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  if (error) throw error;
}

// Bot oyuncu ekle (host only)
export async function addBot(roomId: string, botId: string, botName: string): Promise<void> {
  const { error } = await supabase
    .from('room_players')
    .insert({
      room_id: roomId,
      player_id: botId,
      username: botName,
      is_ready: true,
      is_bot: true,
    });

  if (error) throw error;
}

// Bot oyuncu çıkar
export async function removeBot(roomId: string, botId: string): Promise<void> {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', botId);

  if (error) throw error;
}

// Oyuncuyu kick et (host only)
export async function kickPlayer(roomId: string, playerId: string): Promise<void> {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  if (error) throw error;
}
