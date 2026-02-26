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
