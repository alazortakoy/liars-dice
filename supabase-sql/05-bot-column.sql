-- Bot desteği: room_players tablosuna is_bot kolonu ekle
ALTER TABLE room_players ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Bot oyuncular için RLS politikası güncelle (host bot ekleyebilir/silebilir)
-- Mevcut INSERT politikası authenticated kullanıcılar için zaten çalışıyor
-- Bot'lar da aynı şekilde insert ediliyor (host'un auth.uid()'si ile)
