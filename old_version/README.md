# 🎲 Yalancı Zarı (Liar's Dice)

Karayip Korsanları: Ölü Adamın Sandığı filminden ilham alınarak hazırlanmış, tarayıcı tabanlı blöf oyunu.

![Oyun](https://img.shields.io/badge/Oyuncu-2--6%20Kişi-gold)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## 🏴‍☠️ Oyun Hakkında

Yalancı Zarı, 2-6 oyuncunun katılabildiği klasik bir blöf oyunudur. Her oyuncu kendi zarlarını görür ama diğerlerinin zarlarını göremez. Oyuncular sırayla masadaki toplam zar sayısı hakkında teklif verir. Bir önceki oyuncunun blöf yaptığını düşünen oyuncu "LIAR!" diyerek meydan okuyabilir.

## 🎮 Nasıl Oynanır?

### Başlangıç
1. Oyunu açın ve oyuncu sayısını seçin (2-6 arası)
2. İsterseniz oyuncu isimlerini özelleştirin
3. "Oyunu Başlat" butonuna tıklayın

### Oyun Akışı
1. Her oyuncu 5 zar ile başlar
2. Sıra size geldiğinde iki seçeneğiniz var:
   - **Teklif Ver**: Masadaki toplam zarların içinde en az kaç tane belirli bir değer olduğunu tahmin edin
   - **LIAR!**: Bir önceki oyuncunun blöf yaptığını iddia edin

### Teklif Kuralları
- Her yeni teklif, öncekinden **daha yüksek** olmalıdır
- Ya miktar artırılmalı (örn: 3×5 → 4×5)
- Ya da değer artırılmalı (örn: 3×5 → 3×6)
- **1'ler (⚀) jokerdir** - her değer için sayılır!

### Meydan Okuma
- "LIAR!" denildiğinde tüm zarlar açılır
- Teklif doğruysa (yeterli zar varsa): Meydan okuyan 1 zar kaybeder
- Teklif yanlışsa: Teklif veren 1 zar kaybeder
- Tüm zarlarını kaybeden oyuncu elenir

### Kazanma
Son kalan oyuncu oyunu kazanır! 🏆

## 🎯 Özellikler

- ✅ 2-6 oyuncu desteği
- ✅ Korsan temalı arayüz
- ✅ Joker sistemi (1'ler)
- ✅ Round-robin tur sistemi
- ✅ Detaylı sonuç ekranı
- ✅ Oyun logu
- ✅ Responsive tasarım

## 🛠️ Teknolojiler

- **HTML5** - Yapı
- **CSS3** - Stil ve animasyonlar
- **Vanilla JavaScript** - Oyun mantığı (framework yok)

## 📁 Proje Yapısı

```
zar oyunu/
├── index.html          # Ana HTML dosyası
├── css/
│   └── style.css       # Tüm stiller
├── js/
│   ├── constants.js    # Sabitler ve ayarlar
│   ├── dice.js         # Zar fonksiyonları
│   ├── player.js       # Oyuncu sınıfı
│   ├── bid.js          # Teklif sistemi
│   ├── game.js         # Oyun mantığı
│   ├── ui.js           # Arayüz işlemleri
│   └── main.js         # Başlatıcı
└── README.md           # Bu dosya
```

## 🚀 Kurulum

1. Projeyi indirin veya klonlayın
2. `index.html` dosyasını tarayıcınızda açın
3. Oynayın!

Sunucu gerektirmez, doğrudan tarayıcıda çalışır.

## 🎨 Ekran Görüntüleri

### Ana Menü
- Oyuncu sayısı seçimi
- İsim özelleştirme

### Oyun Ekranı
- Sol: Oyuncu kartları ve zarlar
- Sağ: Teklif paneli ve log

### Sonuç Ekranı
- Teklif bilgisi
- Sayım özeti (hedef + joker = toplam)
- Tüm zarlar vurgulu gösterim

## 📜 Lisans

Bu proje eğitim amaçlıdır.

---

⚓ *"Zarlar bize yalan söylemeyi öğretti..."* - Davy Jones
