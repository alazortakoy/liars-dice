// Oyun tipleri

export interface Player {
  id: string;
  username: string;
  isAnonymous: boolean;
}

export interface RoomSettings {
  jokerRule: boolean;
  startingDice: number;
  turnTimer: number; // saniye, 0 = sınırsız
  maxPlayers: number;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  settings: RoomSettings;
  status: 'waiting' | 'playing' | 'finished';
  createdAt: string;
}

export interface RoomPlayer {
  id: string;
  roomId: string;
  playerId: string;
  username: string;
  isReady: boolean;
  joinedAt: string;
}

export interface Bid {
  playerId: string;
  quantity: number;
  value: number; // 1-6
}

export interface GamePlayer {
  id: string;
  username: string;
  diceCount: number;
  dice: number[]; // Sadece kendi zarlarımız görünür
  isEliminated: boolean;
  isDisconnected: boolean;
}

export interface GameState {
  roomCode: string;
  players: GamePlayer[];
  currentTurnPlayerId: string;
  round: number;
  lastBid: Bid | null;
  status: 'active' | 'round_end' | 'revealing' | 'finished';
  settings: RoomSettings;
  winnerId: string | null;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  username: string;
  message: string;
  isSystem: boolean;
  createdAt: string;
}

// Realtime event tipleri
export type RealtimeEvent =
  | { type: 'game:start'; payload: GameState }
  | { type: 'dice:roll'; payload: { playerId: string; diceCount: number } }
  | { type: 'bid:make'; payload: Bid }
  | { type: 'bid:liar'; payload: { callerId: string } }
  | { type: 'dice:reveal'; payload: { players: { id: string; dice: number[] }[] } }
  | { type: 'round:end'; payload: { loserId: string; reason: string } }
  | { type: 'game:end'; payload: { winnerId: string } }
  | { type: 'player:eliminated'; payload: { playerId: string } }
  | { type: 'player:disconnected'; payload: { playerId: string } };
