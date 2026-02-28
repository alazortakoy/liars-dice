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

## Oturum 3 — 2026-02-28
### Yapılanlar — Bug Fix + Yeni Özellikler

#### Bug Fix'ler
- **AbortError çözümü**: Supabase GoTrueClient `navigator.locks` çatışması düzeltildi
  - `supabase.ts`: No-op lock fonksiyonu ile lock mekanizması devre dışı bırakıldı
  - `useAuth.tsx`: `onAuthStateChange` → `getSession` sıralaması düzeltildi (Supabase resmi önerisi)
  - `INITIAL_SESSION` + `TOKEN_REFRESHED` event'leri eklendi
- **Bağlantı kopma mekanizması iyileştirildi**
  - `useGameChannel.ts`: `beforeunload` handler eklendi — tab kapanınca Presence'dan hemen çıkış
  - `visibilitychange` handler — mobil arka plan/ön plan geçişlerinde re-track
  - `useGameState.ts`: Disconnect olan oyuncu artık otomatik eleniyor (`isEliminated: true`)
  - Sırası disconnect olan oyuncudaysa, sıra sonraki oyuncuya atlanıyor
  - `game-service.ts`: `getNextTurnPlayerId` artık `isDisconnected` oyuncuları da atlıyor
- **Oyun başlama race condition düzeltildi**
  - Non-host oyuncular için 5sn fallback polling (game:start event kaçırılırsa DB'den recovery)
  - `room/[code]/page.tsx`: Tüm oyuncular ready olunca 3sn geri sayım + otomatik başlama
  - Host manuel "Start Game" butonu da korundu (erken başlatma için)
- **Guest auth iyileştirildi**: `INITIAL_SESSION` event ile session recovery düzeltildi

#### Yeni Özellikler
- **Bot Oyuncular** (`bot-engine.ts` — yeni dosya)
  - Korsan temalı bot isimleri (Captain Hook, Blackbeard, Anne Bonny, vb.)
  - Olasılık tabanlı karar motoru: bid vs LIAR kararı
  - Host tarafında çalışan bot zarları ve hamleleri
  - 2-4sn delay ile gerçekçi hamle süresi
  - Bekleme odasında "Add Bot" / "Remove" butonları (host only)
  - Bot'lar otomatik ready, Presence/disconnect'ten muaf
  - `room_players` tablosuna `is_bot` kolonu (SQL migration)
- **Host Kick**
  - Her oyuncu kartında kick butonu (sadece host görür)
  - Bot'lar için "✕" remove butonu, oyuncular için "Kick" butonu
  - Kick detection: room_players'dan silinen oyuncu lobby'ye yönlendiriliyor
  - `room-service.ts`: `kickPlayer`, `addBot`, `removeBot` fonksiyonları
- **Tip güncellemeleri**
  - `GamePlayer.isBot` optional field
  - `Bid.skipTo` optional field (disconnect turn skip)
  - `player:kicked` RealtimeEvent tipi
- Build başarılı (0 hata)

### Supabase'de Yapılması Gereken
- `supabase-sql/05-bot-column.sql` dosyasını Supabase SQL Editor'da çalıştır

### Sonraki Adım
- Faz 8: Ses efektleri + görsel polish
- Test senaryolarını uygula (2 tarayıcı + bot)

## Oturum 4 — 2026-02-28
### Yapılanlar — Kritik Bug Fix + Auth Değişikliği

#### Auth Değişikliği
- **Guest/anonim giriş kaldırıldı**: Sadece email + password ile sign up / sign in
  - `page.tsx`: Guest buton kaldırıldı, email formu varsayılan gösterim
  - `useAuth.tsx`: `signInAnonymously` fonksiyonu ve `isAnonymous` alanı kaldırıldı
  - `types/index.ts`: `Player.isAnonymous` alanı kaldırıldı
  - `CLAUDE.md`: "Anonim + Google giriş" → "Email + password giriş" güncellendi

#### Bug Fix'ler
- **leaveRoom boş oda silme**: Non-host son oyuncu ayrılınca oda silinmiyordu
  - `room-service.ts`: Boş oda kontrolü artık tüm ayrılmalarda yapılıyor (sadece host değil)
- **Bekleme odasında Presence eklendi**: Tarayıcı kapanınca oyuncu düşmüyordu
  - `useRoomPresence.ts` (yeni hook): Bekleme odasında Presence takibi
  - 30sn timeout → `leaveRoom()` çağrısı → oyuncu odadan silinir
  - F5 yapılırsa 30sn içinde rejoin → timeout iptal
  - `room/[code]/page.tsx`: `useRoomPresence` hook'u entegre edildi
- **Host kopma — host devri**: Oyun sırasında host koparsa oyun duruyordu
  - `useGameState.ts`: Host disconnect algılandığında ilk uygun oyuncuya host devri
  - Yeni host DB'de `rooms.host_id` günceller
  - Timer, bot, round yönetimi yeni host'a geçer
- **kickPlayer host doğrulaması**: Service level'da host kontrolü yoktu
  - `room-service.ts`: `kickPlayer()` artık `hostId` parametresi alıp DB'den doğrulama yapıyor

#### Supabase Temizlik
- `supabase-sql/06-cleanup-all-data.sql`: Tüm tabloları temizleyen SQL hazırlandı

#### Bağlantı Yönetimi Case'leri
- [x] Leave room tıklama → odadan çıkar, lobby'ye döner
- [x] Tarayıcı kapatma (room) → 30sn timeout → odadan silinir
- [x] F5 (room) → 30sn rejoin → hiçbir şey olmaz
- [x] Tarayıcı kapatma (game) → 30sn → oyuncudan elenme
- [x] F5 (game) → DB'den recovery
- [x] Host kopma (game) → host devri + oyun devam
- [x] Son oyuncu ayrılma → oda silinir
- [x] Sırası gelen kopuk → sıra atlanır

- Build başarılı (0 hata)

### Supabase'de Yapılması Gereken
- `supabase-sql/06-cleanup-all-data.sql` dosyasını Supabase SQL Editor'da çalıştır
- Auth → Users'dan tüm kullanıcıları sil (temiz başlangıç)

### Sonraki Adım
- Vercel deploy + mobil test
- Faz 8: Ses efektleri + görsel polish
