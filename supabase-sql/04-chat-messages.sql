-- Chat Messages tablosu
-- Supabase Dashboard → SQL Editor → New Query → Bu SQL'i çalıştır

-- ============================================
-- 1. CHAT_MESSAGES TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 200),
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndexler
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);

-- RLS aktif et
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Odadaki oyuncular okuyabilir
CREATE POLICY "Chat messages are viewable by room players"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = chat_messages.room_id
      AND room_players.player_id = auth.uid()
    )
  );

-- Authenticated kullanıcılar kendi mesajını yazabilir
CREATE POLICY "Players can send chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = player_id
    AND EXISTS (
      SELECT 1 FROM room_players
      WHERE room_players.room_id = chat_messages.room_id
      AND room_players.player_id = auth.uid()
    )
  );
