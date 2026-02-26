import type { Bid } from '@/types';

// Zar atma
export function rollDice(count: number): number[] {
  const dice: number[] = [];
  for (let i = 0; i < count; i++) {
    dice.push(Math.floor(Math.random() * 6) + 1);
  }
  return dice.sort((a, b) => a - b);
}

// Belirli değerdeki zarları say (joker dahil)
export function countDiceValue(allDice: number[], value: number, jokerRule: boolean): number {
  let count = 0;
  for (const die of allDice) {
    if (die === value) count++;
    if (jokerRule && die === 1 && value !== 1) count++;
  }
  return count;
}

// Teklif geçerli mi?
export function isValidBid(newBid: Bid, lastBid: Bid | null): boolean {
  if (!lastBid) return true;
  if (newBid.quantity > lastBid.quantity) return true;
  if (newBid.quantity === lastBid.quantity && newBid.value > lastBid.value) return true;
  return false;
}

// LIAR çağrısını değerlendir
export function evaluateLiarCall(
  lastBid: Bid,
  allDice: number[],
  jokerRule: boolean
): {
  bidQuantity: number;
  bidValue: number;
  actualCount: number;
  bidWasCorrect: boolean;
} {
  const actualCount = countDiceValue(allDice, lastBid.value, jokerRule);
  return {
    bidQuantity: lastBid.quantity,
    bidValue: lastBid.value,
    actualCount,
    bidWasCorrect: actualCount >= lastBid.quantity,
  };
}

// 6 haneli oda kodu üret
export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Karışıklık yaratanlar çıkarıldı (I,O,0,1)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
