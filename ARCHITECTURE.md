# Liar's Dice — Teknik Mimari

## Genel Yapı
```
Browser (Next.js + TypeScript + Tailwind CSS v4)
    ↕ HTTPS
Supabase (Auth + PostgreSQL + Realtime)
    ↕
Vercel (SSR + Static)
```

## Routing
- Next.js App Router (file-based routing)
- / → Login sayfası
- /lobby → Oda listesi
- /room/[code] → Bekleme odası
- /game/[code] → Oyun ekranı

## Supabase Tabloları

### profiles
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid (PK) | Supabase Auth user ID |
| username | text (unique) | Kullanıcı adı |
| created_at | timestamptz | Oluşturulma tarihi |

### rooms
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid (PK) | Oda ID |
| code | text (unique) | 6 haneli oda kodu |
| host_id | uuid (FK→profiles) | Host kullanıcı |
| settings | jsonb | {jokerRule, startingDice, turnTimer, maxPlayers} |
| status | text | waiting / playing / finished |
| created_at | timestamptz | Oluşturulma tarihi |

### room_players
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid (PK) | Kayıt ID |
| room_id | uuid (FK→rooms) | Oda |
| player_id | uuid (FK→profiles) | Oyuncu |
| is_ready | boolean | Hazır durumu |
| joined_at | timestamptz | Katılma tarihi |

### game_state (Realtime Broadcast ile — DB'de minimal)
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid (PK) | Kayıt ID |
| room_id | uuid (FK→rooms) | Oda |
| round | integer | Tur numarası |
| current_turn | uuid | Sırası olan oyuncu |
| status | text | active / round_end / finished |
| updated_at | timestamptz | Son güncelleme |

### chat_messages
| Kolon | Tip | Açıklama |
|-------|-----|----------|
| id | uuid (PK) | Mesaj ID |
| room_id | uuid (FK→rooms) | Oda |
| player_id | uuid (FK→profiles) | Gönderen |
| message | text | Mesaj (max 200 karakter) |
| is_system | boolean | Sistem mesajı mı |
| created_at | timestamptz | Gönderim tarihi |

## Realtime Stratejisi
- Channel adı: `room:{roomCode}`
- **Presence:** Oyuncu online durumu, ready state
- **Broadcast events:**
  - `game:start` — Oyun başladı
  - `dice:roll` — Zarlar atıldı (şifrelenmiş)
  - `bid:make` — Teklif yapıldı
  - `bid:liar` — LIAR çağrısı
  - `dice:reveal` — Zarlar açıldı
  - `round:end` — Tur bitti
  - `game:end` — Oyun bitti
  - `player:eliminated` — Oyuncu elendi
  - `player:disconnected` — Bağlantı koptu

## Güvenlik (MVP)
- Zarlar client-side atılır (hile riski kabul edilir)
- RLS: Kullanıcı sadece kendi profilini düzenleyebilir
- RLS: Oda bilgileri herkese açık (read), yazma host'a özel
- Anon key client'ta açık (RLS ile korunur)
