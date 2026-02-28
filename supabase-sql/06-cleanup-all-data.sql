-- ========================================
-- TÜM VERİLERİ TEMİZLE (sıra önemli — FK bağımlılıkları)
-- Bu SQL'i Supabase SQL Editor'da çalıştır
-- ========================================

-- 1. Önce bağımlı tabloları temizle
DELETE FROM chat_messages;
DELETE FROM game_state;
DELETE FROM room_players;

-- 2. Sonra ana tabloları temizle
DELETE FROM rooms;

-- 3. Profilleri temizle (yeni kayıtlarla başlamak için)
DELETE FROM profiles;

-- Doğrulama: tüm tablolar boş mu?
SELECT 'chat_messages' AS tablo, COUNT(*) AS kayit FROM chat_messages
UNION ALL
SELECT 'game_state', COUNT(*) FROM game_state
UNION ALL
SELECT 'room_players', COUNT(*) FROM room_players
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles;
