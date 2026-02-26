// Uygulama sabitleri
export const APP_CONFIG = {
  appName: "Liar's Dice",
  version: '0.1.0',
  maxPlayersPerRoom: 8,
  minPlayersPerRoom: 2,
  defaultStartingDice: 5,
  defaultTurnTimer: 30,
  roomCodeLength: 6,
  maxChatMessageLength: 200,
  disconnectTimeout: 30000, // 30 saniye
} as const;

// Tur süresi seçenekleri
export const TURN_TIMER_OPTIONS = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: 'Unlimited', value: 0 },
] as const;
