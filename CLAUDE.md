# Liar's Dice — Proje Kuralları

## Proje Hakkında
Online çok oyunculu Liar's Dice (Yalancı Zarı) oyunu.
Korsan temalı, mobile-first, Supabase Realtime ile gerçek zamanlı.

## Teknoloji Stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (Auth + PostgreSQL + Realtime)
- **Hosting:** Vercel
- **UI Dili:** İngilizce
- **Kod Yorumları:** Türkçe

## Çalışma Kuralları
- Tüm terminal komutlarını Claude çalıştırır, kullanıcı onaylar
- Her anlamlı değişiklikte git commit + push (Türkçe mesajla)
- Hata olursa Claude çözer, kullanıcıya ne olduğunu anlatır
- Büyük değişiklikler öncesi plan sunulur, onay beklenir
- Küçük fix'lerde plan istenmez, direkt uygulanır
- Her oturum sonunda PROGRESS.md güncellenir
- Yeni özellik mevcut çalışan kodu bozmamalı
- "Düzelttim" deyip geçme, doğrula

## Dosya Yapısı
```
src/
├── app/
│   ├── layout.tsx           # Root layout (ToastProvider)
│   ├── page.tsx             # Login sayfası (/)
│   ├── globals.css          # Tailwind + korsan teması
│   ├── lobby/page.tsx       # Lobby (/lobby)
│   ├── room/[code]/page.tsx # Bekleme odası (/room/XXXXXX)
│   └── game/[code]/page.tsx # Oyun ekranı (/game/XXXXXX)
├── components/ui/           # Button, Card, Modal, Input, Toast, Badge, Dice
├── lib/
│   ├── supabase.ts          # Supabase client
│   ├── config.ts            # Uygulama sabitleri
│   └── game-logic.ts        # Oyun mantığı (zar, teklif, LIAR)
├── hooks/                   # Custom React hooks
└── types/index.ts           # TypeScript tipleri
```

## Supabase Tabloları
- profiles, rooms, room_players, game_state, chat_messages

## Önemli Kararlar
- Mobile-first tasarım (320px'den itibaren)
- Korsan teması (koyu renkler, altın vurgular)
- 2-8 oyuncu/oda
- Anonim + Google giriş
- Host tam kontrol (joker, zar sayısı, süre)
- Bağlantı kopma: 30sn bekle → ele
- Client-side zar atma (MVP)
