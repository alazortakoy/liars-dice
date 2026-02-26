# Liar's Dice — Detaylı Spesifikasyon

## 1. Oyun Kuralları
- Her oyuncu 5 zarla başlar (host ayarlanabilir: 1-5)
- Sırayla teklif yapılır: "Masada toplam en az X adet Y-değerli zar var"
- Sonraki oyuncu ya daha yüksek teklif yapar ya "LIAR!" der
- Daha yüksek teklif = daha fazla miktar VEYA aynı miktar + daha yüksek zar değeri
- LIAR dendiğinde tüm zarlar açılır:
  - Teklif doğru (>= o kadar var) → LIAR diyen 1 zar kaybeder
  - Teklif yanlış (< o kadar var) → Teklifi yapan 1 zar kaybeder
- Zarı biten oyuncu elenir
- Son kalan oyuncu kazanır
- Joker kuralı (opsiyonel): 1 değerli zarlar her değere sayılır

## 2. Kullanıcı Akışı
1. **Login Ekranı** → Anonim (Guest) veya Google ile giriş
2. **Kullanıcı Adı** → İlk girişte username belirleme
3. **Lobby** → Açık odaları gör, oda oluştur, kodla katıl
4. **Room (Bekleme)** → Oyuncular hazır olur, host başlatır
5. **Game** → Oyun oynanır (teklif / LIAR döngüsü)
6. **Result** → Kazanan gösterilir, tekrar oyna veya lobiye dön

## 3. Oda Sistemi
- 6 haneli benzersiz oda kodu
- 2-8 oyuncu kapasitesi
- Host ayarları:
  - Joker kuralı (açık/kapalı)
  - Başlangıç zar sayısı (1-5, default: 5)
  - Tur süresi (15s / 30s / 60s / sınırsız)
  - Max oyuncu sayısı (2-8)
- Herkes "Ready" olunca host "Start Game" basabilir
- Host çıkarsa sıradaki oyuncu host olur

## 4. Auth Sistemi
- Supabase Auth kullanılır
- Anonim giriş: Tek tıkla, geçici hesap
- Google giriş: Kalıcı hesap
- İlk girişte username belirlenir (profiles tablosunda)
- Oturum localStorage'da saklanır

## 5. Realtime
- Supabase Realtime Channels kullanılır
- Her oda ayrı channel
- Presence: Online durumu, hazır/değil
- Broadcast: Oyun hamleleri (teklif, LIAR, zar açma)
- Bağlantı kopma: 30sn timeout → oyuncuyu ele

## 6. Chat
- Oyun içi yazılı mesajlaşma
- 200 karakter limit
- Sistem mesajları (katılma, ayrılma, eleme)
- Realtime ile anlık

## 7. Tasarım
- Mobile-first (320px → 375px → 768px → 1024px)
- Korsan teması: Koyu renkler, altın vurgular, tahta dokusu hissi
- Touch-friendly: Min 44px butonlar
- Zar animasyonları (CSS)
- Ekran geçiş animasyonları

## 8. Teknik
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Auth + DB + Realtime)
- Vercel hosting
- Client-side zar atma (MVP — server-side v2'de)
- RLS aktif
