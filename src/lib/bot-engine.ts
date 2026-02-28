import type { Bid } from '@/types';
import { countDiceValue, rollDice } from './game-logic';

// Korsan temalı bot isimleri
const BOT_NAMES = [
  'Captain Hook',
  'Blackbeard',
  'Anne Bonny',
  'Calico Jack',
  'Red Beard',
  'Davy Jones',
  'Long John',
  'Mad Morgan',
] as const;

// Kullanılmamış bot ismi seç
export function getAvailableBotName(usedNames: string[]): string {
  const available = BOT_NAMES.filter((n) => !usedNames.includes(n));
  if (available.length === 0) {
    // Tüm isimler kullanıldıysa rastgele numara ekle
    return `Pirate #${Math.floor(Math.random() * 100)}`;
  }
  return available[Math.floor(Math.random() * available.length)];
}

// Bot ID üret (room_players'da kullanılacak)
export function generateBotId(): string {
  return `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Bot zarlarını at
export function rollBotDice(count: number): number[] {
  return rollDice(count);
}

// Bot karar motoru
export interface BotDecision {
  action: 'bid' | 'liar';
  bid?: { quantity: number; value: number };
}

export function decideBotAction(
  botDice: number[],
  lastBid: Bid | null,
  totalDiceOnTable: number,
  jokerRule: boolean
): BotDecision {
  // İlk hamle — lastBid yok, teklif yap
  if (!lastBid) {
    return makeSmartBid(botDice, null, totalDiceOnTable, jokerRule);
  }

  // Son teklifin olasılığını hesapla
  const liarProbability = estimateLiarProbability(botDice, lastBid, totalDiceOnTable, jokerRule);

  // %60+ olasılıkla yalan → LIAR de
  if (liarProbability > 0.6) {
    return { action: 'liar' };
  }

  // %40-%60 arası → rastgele karar (%30 LIAR)
  if (liarProbability > 0.4 && Math.random() < 0.3) {
    return { action: 'liar' };
  }

  // Teklif yap
  return makeSmartBid(botDice, lastBid, totalDiceOnTable, jokerRule);
}

// Son teklifin yalan olma olasılığını tahmin et
function estimateLiarProbability(
  botDice: number[],
  lastBid: Bid,
  totalDice: number,
  jokerRule: boolean
): number {
  // Bot'un kendi zarlarında kaç tane var
  const myCount = countDiceValue(botDice, lastBid.value, jokerRule);

  // Kalan zarlardan beklenen sayı
  const otherDice = totalDice - botDice.length;
  // Her zarın belirli değere gelme olasılığı (joker dahil)
  const probability = jokerRule && lastBid.value !== 1 ? 2 / 6 : 1 / 6;
  const expectedFromOthers = otherDice * probability;

  const totalExpected = myCount + expectedFromOthers;

  // Teklif beklenen değerin ne kadar üstünde?
  if (lastBid.quantity <= totalExpected * 0.7) return 0.1; // Güvenli teklif
  if (lastBid.quantity <= totalExpected) return 0.3;        // Makul teklif
  if (lastBid.quantity <= totalExpected * 1.3) return 0.5;  // Riskli teklif
  if (lastBid.quantity <= totalExpected * 1.6) return 0.7;  // Muhtemelen yalan
  return 0.85; // Çok yüksek ihtimalle yalan
}

// Akıllı teklif yap
function makeSmartBid(
  botDice: number[],
  lastBid: Bid | null,
  totalDice: number,
  jokerRule: boolean
): BotDecision {
  // En çok sahip olduğu zar değerini bul
  const valueCounts = new Map<number, number>();
  for (let v = 1; v <= 6; v++) {
    valueCounts.set(v, countDiceValue(botDice, v, jokerRule));
  }

  // En güçlü değer (1'ler joker ise daha az değerli sayılır)
  let bestValue = 2;
  let bestCount = 0;
  for (const [value, count] of valueCounts) {
    if (count > bestCount || (count === bestCount && value > bestValue)) {
      bestCount = count;
      bestValue = value;
    }
  }

  if (!lastBid) {
    // İlk teklif — elindeki en güçlü değerden makul bir teklif
    const quantity = Math.max(1, Math.ceil(totalDice / 6));
    return { action: 'bid', bid: { quantity, value: bestValue } };
  }

  // Mevcut teklifi yükselt
  // Strateji 1: Aynı miktarı daha yüksek değerle
  if (lastBid.value < 6) {
    // Elimdeki güçlü değerlerden lastBid.value'den büyük olanı seç
    for (let v = lastBid.value + 1; v <= 6; v++) {
      if ((valueCounts.get(v) || 0) >= 1) {
        return { action: 'bid', bid: { quantity: lastBid.quantity, value: v } };
      }
    }
    // Elimde yoksa bile miktarı aynı tutup değeri yükselt
    return { action: 'bid', bid: { quantity: lastBid.quantity, value: lastBid.value + 1 } };
  }

  // Strateji 2: Miktarı artır
  return { action: 'bid', bid: { quantity: lastBid.quantity + 1, value: bestValue } };
}

// Bot turn delay (2-4 saniye arası)
export function getBotDelay(): number {
  return 2000 + Math.random() * 2000;
}
