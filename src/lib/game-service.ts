import { supabase } from './supabase';
import type { GamePlayer, Bid, RoomSettings } from '@/types';
import { fetchRoomPlayers } from './room-service';
import { rollDice } from './game-logic';

// DB'den dönen game_state satırı
export interface GameStateRow {
  id: string;
  room_id: string;
  players: GamePlayer[];
  current_turn_player_id: string;
  round: number;
  last_bid: Bid | null;
  status: 'active' | 'round_end' | 'revealing' | 'finished';
  winner_id: string | null;
  turn_order: string[];
  updated_at: string;
}

// Oyun state'ini oluştur (host çağırır)
export async function createGameState(
  roomId: string,
  settings: RoomSettings
): Promise<GameStateRow> {
  // Odadaki oyuncuları çek
  const roomPlayers = await fetchRoomPlayers(roomId);

  // Rastgele sıralama
  const shuffled = [...roomPlayers].sort(() => Math.random() - 0.5);
  const turnOrder = shuffled.map((p) => p.player_id);

  // GamePlayer dizisi oluştur (dice boş — herkes kendi atar, botlar hariç)
  const players: GamePlayer[] = shuffled.map((p) => ({
    id: p.player_id,
    username: p.username,
    diceCount: settings.startingDice,
    dice: [], // Herkes kendi zarlarını local atar
    isEliminated: false,
    isDisconnected: false,
    isBot: p.is_bot || false,
  }));

  const { data, error } = await supabase
    .from('game_state')
    .insert({
      room_id: roomId,
      players,
      current_turn_player_id: turnOrder[0],
      round: 1,
      last_bid: null,
      status: 'active',
      winner_id: null,
      turn_order: turnOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GameStateRow;
}

// Oyun state'ini getir (recovery için)
export async function fetchGameState(roomId: string): Promise<GameStateRow | null> {
  const { data, error } = await supabase
    .from('game_state')
    .select('*')
    .eq('room_id', roomId)
    .single();

  if (error) return null;
  return data as GameStateRow;
}

// Oyun state'ini güncelle (host çağırır)
export async function updateGameState(
  roomId: string,
  updates: Partial<Pick<GameStateRow, 'players' | 'current_turn_player_id' | 'round' | 'last_bid' | 'status' | 'winner_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('game_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId);

  if (error) throw error;
}

// Sıradaki oyuncuyu bul (eliminated ve disconnected olanları atla)
export function getNextTurnPlayerId(
  turnOrder: string[],
  currentPlayerId: string,
  players: GamePlayer[]
): string {
  const activePlayers = players.filter((p) => !p.isEliminated && !p.isDisconnected);
  if (activePlayers.length <= 1) return activePlayers[0]?.id || currentPlayerId;

  const activeIds = new Set(activePlayers.map((p) => p.id));
  const currentIndex = turnOrder.indexOf(currentPlayerId);

  // Sıradaki aktif oyuncuyu bul
  for (let i = 1; i <= turnOrder.length; i++) {
    const nextIndex = (currentIndex + i) % turnOrder.length;
    const nextId = turnOrder[nextIndex];
    if (activeIds.has(nextId)) return nextId;
  }

  return currentPlayerId;
}

// Room status'u güncelle
export async function updateRoomStatus(
  roomId: string,
  status: 'waiting' | 'playing' | 'finished'
): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ status })
    .eq('id', roomId);

  if (error) throw error;
}
