-- Rooms + Room Players tabloları
-- Supabase Dashboard → SQL Editor → New Query → Bu SQL'i çalıştır

-- ============================================
-- 1. ROOMS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{"jokerRule": true, "startingDice": 5, "turnTimer": 30, "maxPlayers": 6}',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kod ve durum indexleri
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON rooms(host_id);

-- RLS aktif et
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Herkes odaları görebilir (lobby listesi için)
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  USING (true);

-- Giriş yapmış kullanıcı oda oluşturabilir (kendi host_id'si ile)
CREATE POLICY "Authenticated users can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

-- Host odayı güncelleyebilir (ayar, durum değişikliği)
CREATE POLICY "Host can update their room"
  ON rooms FOR UPDATE
  USING (auth.uid() = host_id);

-- Host odayı silebilir
CREATE POLICY "Host can delete their room"
  ON rooms FOR DELETE
  USING (auth.uid() = host_id);

-- ============================================
-- 2. ROOM_PLAYERS TABLOSU
-- ============================================
CREATE TABLE IF NOT EXISTS room_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  -- Aynı oyuncu aynı odaya iki kez katılamaz
  UNIQUE(room_id, player_id)
);

-- İndexler
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_player_id ON room_players(player_id);

-- RLS aktif et
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- Herkes oyuncu listesini görebilir
CREATE POLICY "Room players are viewable by everyone"
  ON room_players FOR SELECT
  USING (true);

-- Giriş yapmış kullanıcı katılabilir (kendi player_id'si ile)
CREATE POLICY "Authenticated users can join rooms"
  ON room_players FOR INSERT
  WITH CHECK (auth.uid() = player_id);

-- Oyuncu kendi kaydını güncelleyebilir (ready durumu)
CREATE POLICY "Players can update their own record"
  ON room_players FOR UPDATE
  USING (auth.uid() = player_id);

-- Oyuncu odadan ayrılabilir (kendi kaydını silebilir)
CREATE POLICY "Players can leave rooms"
  ON room_players FOR DELETE
  USING (auth.uid() = player_id);

-- ============================================
-- 3. REALTIME YAYINI
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
