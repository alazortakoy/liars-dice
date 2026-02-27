# Liar's Dice — İlerleme Kaydı

## Oturum 1 — 2026-02-26
### Yapılanlar
- Proje mülakat tamamlandı, tüm kararlar onaylandı
- Proje planı hazırlandı (10 fazlı geliştirme)
- **Teknoloji değişikliği:** Vanilla HTML → Next.js + TypeScript + Tailwind CSS v4
- Git repo başlatıldı
- Next.js projesi oluşturuldu (App Router, Tailwind v4, TypeScript)
- Supabase client kuruldu (@supabase/supabase-js)
- Korsan teması Tailwind ile yapılandırıldı (globals.css)
- Ortak UI bileşenleri: Button, Card, Input, Modal, Toast, Badge, Dice
- TypeScript tipleri tanımlandı (types/index.ts)
- Oyun mantığı yazıldı (game-logic.ts): rollDice, countDiceValue, isValidBid, evaluateLiarCall
- Tüm sayfalar iskelet olarak oluşturuldu (login, lobby, room, game)
- Build başarılı (0 hata)

### Bekleyen
- Supabase hesabı açılacak (kullanıcı tarafından)
- Google OAuth ayarlanacak
- Vercel hesabı açılacak

### Sonraki Adım
- Faz 2: Auth sistemi (Supabase Anonim + Google giriş)

## Oturum 2 — 2026-02-27
### Yapılanlar
- **Faz 5: Oyun Motoru** tamamlandı
- `game_state` SQL tablosu oluşturuldu (RLS + host yetkisi) — `supabase-sql/03-game-state.sql`
- `useGameChannel` hook: Supabase Realtime Broadcast kanalı yönetimi
- `useGameState` hook: tam oyun döngüsü
  - Host-authoritative mimari (host = sunucu rolünde)
  - Oyun başlatma, zar atma, teklif yapma, LIAR çağrısı
  - Zar reveal, round sonu, eleme, kazanan belirleme
  - Sayfa yenilemede DB'den recovery
- `game-service.ts`: createGameState, fetchGameState, updateGameState, getNextTurnPlayerId
- `game/[code]/page.tsx`: mock data kaldırıldı, gerçek oyun UI bağlandı
  - Rakip zarları gizli/açık gösterim
  - Sıra göstergesi (gold border)
  - Round sonucu bildirimi
  - Oyun bitti ekranı (kazanan gösterimi)
  - Oyun logu (bid, liar, reveal, elimination, system)
- Build başarılı (0 hata)

### Supabase'de Yapılması Gereken
- `supabase-sql/03-game-state.sql` dosyasını Supabase SQL Editor'da çalıştır

- **Faz 6: Oyun İçi Ekstralar** tamamlandı
- Turn timer: geri sayım gösterimi, son 5sn kırmızı, süre dolunca otomatik LIAR/bid
- Bağlantı kopma: Supabase Presence ile online takibi, 30sn timeout → disconnect
- Bilgi paneli: oyuncu sayısı (alive/total), toplam zar, sıra + son teklif birleşik bar
- Oyun sonu: sıralama tablosu (eleme sırasına göre), kazanan badge
- `turn:timeout` RealtimeEvent tipi eklendi
- Build başarılı (0 hata)

- **Faz 7: Chat Sistemi** tamamlandı
- `chat_messages` SQL tablosu oluşturuldu (RLS + oda bazlı erişim) — `supabase-sql/04-chat-messages.sql`
- `chat-service.ts`: sendChatMessage, sendSystemMessage, fetchChatHistory
- `useChat` hook: Realtime Broadcast ile anlık mesajlaşma + DB persistence
  - Ayrı `chat:ROOMCODE` kanalı
  - Unread count takibi (chat kapalıyken badge)
  - Sayfa yüklendiğinde DB'den mesaj geçmişi
- Chat UI: game sayfasındaki placeholder gerçek çalışan chat ile değiştirildi
  - Kullanıcı mesajları: sağ/sol hizalama, farklı renk (gold = benim, gri = rakip)
  - Sistem mesajları: ortalı, italik, gold renk
  - Enter ile gönder, 200 karakter sınırı, unread badge
  - Auto-scroll yeni mesajlarda
- Sistem mesajları entegrasyonu: host oyun eventlerini (LIAR, elimination, round sonu) chat'e otomatik yazar
- `RealtimeEvent` tipine `chat:message` eklendi
- `useGameState`'ten `roomId` ve `hostId` return edildi
- Build başarılı (0 hata)

### Supabase'de Yapılması Gereken
- `supabase-sql/04-chat-messages.sql` dosyasını Supabase SQL Editor'da çalıştır

### Sonraki Adım
- Faz 8: Ses efektleri + görsel polish
