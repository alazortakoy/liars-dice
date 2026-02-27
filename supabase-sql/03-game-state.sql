-- Game State tablosu
-- Supabase Dashboard → SQL Editor → New Query → Bu SQL'i çalıştır

-- ============================================
-- 1. GAME_STATE TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS game_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID UNIQUE NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  players JSONB NOT NULL DEFAULT '[]',
  current_turn_player_id UUID NOT NULL,
  round INT NOT NULL DEFAULT 1,
  last_bid JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'round_end', 'revealing', 'finished')),
  winner_id UUID,
  turn_order UUID[] NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndexler
CREATE INDEX IF NOT EXISTS idx_game_state_room_id ON game_state(room_id);
CREATE INDEX IF NOT EXISTS idx_game_state_status ON game_state(status);

-- RLS aktif et
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Odadaki oyuncular okuyabilir
CREATE POLICY "Game state is viewable by room players"
  ON game_state FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = game_state.room_id
      AND room_players.player_id = auth.uid()
    )
  );

-- Host game state oluşturabilir
CREATE POLICY "Host can create game state"
  ON game_state FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = game_state.room_id
      AND rooms.host_id = auth.uid()
    )
  );

-- Host game state güncelleyebilir
CREATE POLICY "Host can update game state"
  ON game_state FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = game_state.room_id
      AND rooms.host_id = auth.uid()
    )
  );

-- Host game state silebilir
CREATE POLICY "Host can delete game state"
  ON game_state FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      WHERE rooms.id = game_state.room_id
      AND rooms.host_id = auth.uid()
    )
  );
