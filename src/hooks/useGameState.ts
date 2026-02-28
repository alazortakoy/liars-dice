'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, GamePlayer, Bid, RealtimeEvent, RoomSettings } from '@/types';
import { useGameChannel } from './useGameChannel';
import { rollDice, isValidBid, evaluateLiarCall } from '@/lib/game-logic';
import {
  createGameState,
  fetchGameState,
  updateGameState,
  getNextTurnPlayerId,
  updateRoomStatus,
} from '@/lib/game-service';
import { fetchRoom, fetchRoomPlayers } from '@/lib/room-service';
import { APP_CONFIG } from '@/lib/config';
import { decideBotAction, rollBotDice, getBotDelay } from '@/lib/bot-engine';

// Oyun logu kaydı
export interface GameLogEntry {
  id: string;
  message: string;
  type: 'bid' | 'liar' | 'reveal' | 'round' | 'elimination' | 'system' | 'timer';
  timestamp: number;
}

// Oyun sonu sıralama
export interface PlayerRanking {
  id: string;
  username: string;
  rank: number; // 1 = kazanan
  eliminatedAtRound: number | null;
}

interface UseGameStateReturn {
  gameState: GameState | null;
  myDice: number[];
  isMyTurn: boolean;
  isHost: boolean;
  gameLog: GameLogEntry[];
  revealedDice: { id: string; dice: number[] }[] | null;
  roundResult: { loserId: string; reason: string } | null;
  turnTimeLeft: number | null; // saniye, null = timer yok
  rankings: PlayerRanking[];
  roomId: string;
  hostId: string;
  loading: boolean;
  makeBid: (quantity: number, value: number) => void;
  callLiar: () => void;
  sendMyDice: () => void;
}

// Benzersiz log ID'si
let logIdCounter = 0;
function nextLogId(): string {
  return `log-${Date.now()}-${++logIdCounter}`;
}

export function useGameState(
  roomCode: string,
  userId: string | undefined,
  username: string | undefined
): UseGameStateReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myDice, setMyDice] = useState<number[]>([]);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const [revealedDice, setRevealedDice] = useState<{ id: string; dice: number[] }[] | null>(null);
  const [roundResult, setRoundResult] = useState<{ loserId: string; reason: string } | null>(null);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number | null>(null);
  const [rankings, setRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);

  // Zarları toplamak için ref (LIAR reveal sırasında)
  const collectedDiceRef = useRef<Map<string, number[]>>(new Map());
  const roomIdRef = useRef<string>('');
  const turnOrderRef = useRef<string[]>([]);
  const settingsRef = useRef<RoomSettings | null>(null);

  // Timer ref'leri
  const turnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const turnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnStartRef = useRef<number>(0);

  // Eleme sırası takibi (oyun sonu sıralama için)
  const eliminationOrderRef = useRef<string[]>([]);

  // Fallback timer (game:start kaçırılırsa DB'den yükle)
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bot zarları (host tarafında saklanır)
  const botDiceRef = useRef<Map<string, number[]>>(new Map());

  const isMyTurn = gameState?.currentTurnPlayerId === userId;

  // Log ekleme yardımcısı
  const addLog = useCallback((message: string, type: GameLogEntry['type']) => {
    setGameLog((prev) => [{ id: nextLogId(), message, type, timestamp: Date.now() }, ...prev]);
  }, []);

  // Timer'ı durdur
  const clearTurnTimer = useCallback(() => {
    if (turnTimerRef.current) {
      clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
    }
    if (turnTimeoutRef.current) {
      clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }
    setTurnTimeLeft(null);
  }, []);

  // Timer'ı başlat (host yönetir)
  const startTurnTimer = useCallback(
    (seconds: number) => {
      clearTurnTimer();
      if (seconds <= 0) return; // Unlimited

      turnStartRef.current = Date.now();
      setTurnTimeLeft(seconds);

      // Her saniye geri sayım
      turnTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - turnStartRef.current) / 1000);
        const remaining = Math.max(0, seconds - elapsed);
        setTurnTimeLeft(remaining);

        if (remaining <= 0 && turnTimerRef.current) {
          clearInterval(turnTimerRef.current);
          turnTimerRef.current = null;
        }
      }, 1000);

      // Host timeout broadcast eder
      if (userId === hostIdRef.current) {
        turnTimeoutRef.current = setTimeout(() => {
          // Sırası olan oyuncunun süresini dolduğunu bildir
          const currentTurn = gameStateRef.current?.currentTurnPlayerId;
          if (currentTurn && gameStateRef.current?.status === 'active') {
            sendEventRef.current({
              type: 'turn:timeout',
              payload: { playerId: currentTurn },
            });
          }
        }, seconds * 1000);
      }
    },
    [clearTurnTimer, userId]
  );

  // Sıralama hesapla
  const computeRankings = useCallback((players: GamePlayer[]): PlayerRanking[] => {
    const alive = players.filter((p) => !p.isEliminated);
    const eliminated = eliminationOrderRef.current;

    const result: PlayerRanking[] = [];

    // Kazanan (hayatta kalan)
    if (alive.length === 1) {
      result.push({
        id: alive[0].id,
        username: alive[0].username,
        rank: 1,
        eliminatedAtRound: null,
      });
    }

    // Elenenler (sondan başa = son elenen 2. sırada)
    for (let i = eliminated.length - 1; i >= 0; i--) {
      const pid = eliminated[i];
      const player = players.find((p) => p.id === pid);
      if (player) {
        result.push({
          id: player.id,
          username: player.username,
          rank: result.length + 1,
          eliminatedAtRound: null,
        });
      }
    }

    return result;
  }, []);

  // gameState ref (timer callback'lerinde kullanmak için)
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Broadcast event handler
  const handleEvent = useCallback(
    (event: RealtimeEvent) => {
      switch (event.type) {
        case 'game:start': {
          const gs = event.payload;
          setGameState(gs);
          settingsRef.current = gs.settings;
          turnOrderRef.current = gs.players.map((p) => p.id);
          // Kendi zarlarımı at
          const me = gs.players.find((p) => p.id === userId);
          if (me && !me.isEliminated) {
            const dice = rollDice(me.diceCount);
            setMyDice(dice);
          }
          setRevealedDice(null);
          setRoundResult(null);
          addLog(`Round ${gs.round} started — ${gs.players.reduce((sum, p) => sum + p.diceCount, 0)} dice on the table`, 'round');
          setLoading(false);

          // Host: bot zarlarını at
          if (userId === hostIdRef.current) {
            for (const p of gs.players) {
              if (p.isBot && !p.isEliminated) {
                botDiceRef.current.set(p.id, rollBotDice(p.diceCount));
              }
            }
          }

          // Turn timer başlat
          if (gs.settings.turnTimer > 0) {
            startTurnTimer(gs.settings.turnTimer);
          }

          // Host: sıra botta ise bot hamlesini tetikle
          if (userId === hostIdRef.current) {
            const currentPlayer = gs.players.find((p) => p.id === gs.currentTurnPlayerId);
            if (currentPlayer?.isBot && !currentPlayer.isEliminated) {
              scheduleBotTurn(gs);
            }
          }
          break;
        }

        case 'bid:make': {
          const bid = event.payload;

          // Disconnect sonrası turn skip (host tarafından gönderilir)
          if (bid.playerId === '__skip__' && bid.skipTo) {
            const skipTarget = bid.skipTo;
            setGameState((prev) => {
              if (!prev) return prev;
              return { ...prev, currentTurnPlayerId: skipTarget };
            });
            // Timer'ı yeniden başlat
            if (settingsRef.current && settingsRef.current.turnTimer > 0) {
              startTurnTimer(settingsRef.current.turnTimer);
            }
            break;
          }

          setGameState((prev) => {
            if (!prev) return prev;
            const nextTurn = getNextTurnPlayerId(
              turnOrderRef.current,
              bid.playerId,
              prev.players
            );
            return { ...prev, lastBid: bid, currentTurnPlayerId: nextTurn };
          });
          const gs = gameStateRef.current;
          const bidPlayer = gs?.players.find((p) => p.id === bid.playerId);
          addLog(`${bidPlayer?.username || 'Someone'} bid ${bid.quantity}x ${bid.value}'s`, 'bid');

          // Timer'ı yeniden başlat (yeni tur)
          if (settingsRef.current && settingsRef.current.turnTimer > 0) {
            startTurnTimer(settingsRef.current.turnTimer);
          }

          // Host: sıra bota geçtiyse bot hamlesini tetikle
          if (userId === getHostId()) {
            const updatedGs = gameStateRef.current;
            if (updatedGs) {
              const nextPlayer = updatedGs.players.find((p) => p.id === updatedGs.currentTurnPlayerId);
              if (nextPlayer?.isBot && !nextPlayer.isEliminated) {
                scheduleBotTurn(updatedGs);
              }
            }
          }
          break;
        }

        case 'bid:liar': {
          const { callerId } = event.payload;
          const gs = gameStateRef.current;
          const callerName = gs?.players.find((p) => p.id === callerId)?.username || 'Someone';
          addLog(`${callerName} called LIAR!`, 'liar');
          setGameState((prev) => prev ? { ...prev, status: 'revealing' } : prev);

          // Timer durdur
          clearTurnTimer();

          // Herkes zarlarını paylaşsın — kendi zarlarımı gönder
          if (userId) {
            setTimeout(() => {
              // Kendi zarlarım + host ise bot zarları
              const revealPlayers: { id: string; dice: number[] }[] = [
                { id: userId, dice: myDiceRef.current },
              ];

              // Host: bot zarlarını da reveal et
              if (userId === getHostId()) {
                const currentGs = gameStateRef.current;
                if (currentGs) {
                  for (const p of currentGs.players) {
                    if (p.isBot && !p.isEliminated) {
                      const botDice = botDiceRef.current.get(p.id) || [];
                      revealPlayers.push({ id: p.id, dice: botDice });
                    }
                  }
                }
              }

              sendEventRef.current({
                type: 'dice:reveal',
                payload: { players: revealPlayers },
              });
            }, 100);
          }
          break;
        }

        case 'dice:reveal': {
          // Gelen zarları topla
          for (const p of event.payload.players) {
            collectedDiceRef.current.set(p.id, p.dice);
          }
          // Tüm aktif oyuncuların zarları geldi mi kontrol et
          const gs = gameStateRef.current;
          const activePlayers = gs?.players.filter((p) => !p.isEliminated) || [];
          const allRevealed = activePlayers.every((p) => collectedDiceRef.current.has(p.id));

          if (allRevealed) {
            // Tüm zarlar açık — göster
            const revealed = Array.from(collectedDiceRef.current.entries()).map(([id, dice]) => ({ id, dice }));
            setRevealedDice(revealed);

            // Host LIAR sonucunu hesaplar
            if (gs && userId === getHostId() && gs.lastBid) {
              const allDice = revealed.flatMap((r) => r.dice);
              const result = evaluateLiarCall(
                gs.lastBid,
                allDice,
                settingsRef.current?.jokerRule ?? true
              );

              const lastBidder = gs.lastBid.playerId;
              let loserId: string;
              let reason: string;

              if (result.bidWasCorrect) {
                loserId = gs.currentTurnPlayerId;
                reason = `Bid was correct! (${result.actualCount}x ${result.bidValue}'s found, bid was ${result.bidQuantity})`;
              } else {
                loserId = lastBidder;
                reason = `Bid was wrong! (Only ${result.actualCount}x ${result.bidValue}'s found, bid was ${result.bidQuantity})`;
              }

              // 3sn sonra round:end gönder (zarlar görünsün)
              setTimeout(() => {
                sendEventRef.current({
                  type: 'round:end',
                  payload: { loserId, reason },
                });
              }, 3000);
            }
          }
          break;
        }

        case 'round:end': {
          const { loserId, reason } = event.payload;
          setRoundResult({ loserId, reason });
          const gs = gameStateRef.current;
          const loserName = gs?.players.find((p) => p.id === loserId)?.username || 'Someone';
          addLog(`${loserName} loses a die! ${reason}`, 'reveal');

          setGameState((prev) => {
            if (!prev) return prev;
            const updatedPlayers = prev.players.map((p) => {
              if (p.id === loserId) {
                const newCount = p.diceCount - 1;
                return { ...p, diceCount: newCount, isEliminated: newCount <= 0 };
              }
              return p;
            });

            // Elenen oyuncu kontrolü
            const eliminated = updatedPlayers.find((p) => p.id === loserId && p.isEliminated);
            if (eliminated) {
              addLog(`${eliminated.username} has been eliminated!`, 'elimination');
              eliminationOrderRef.current.push(loserId);
            }

            // Kazanan kontrolü
            const alive = updatedPlayers.filter((p) => !p.isEliminated);
            if (alive.length <= 1) {
              const winnerId = alive[0]?.id || null;
              // Host oyun sonunu bildirir
              if (userId === getHostId()) {
                setTimeout(() => {
                  sendEventRef.current({
                    type: 'game:end',
                    payload: { winnerId: winnerId || '' },
                  });
                }, 2000);
              }
              return {
                ...prev,
                players: updatedPlayers,
                status: 'finished',
                winnerId: winnerId,
              };
            }

            return { ...prev, players: updatedPlayers, status: 'round_end' };
          });

          // 4sn sonra yeni round başlat (host)
          if (userId === getHostId()) {
            setTimeout(() => {
              startNewRound(loserId);
            }, 4000);
          }
          break;
        }

        case 'game:end': {
          const { winnerId } = event.payload;
          clearTurnTimer();
          setGameState((prev) => {
            if (!prev) return prev;
            const updated = { ...prev, status: 'finished' as const, winnerId };
            // Sıralama hesapla
            setRankings(computeRankings(updated.players));
            return updated;
          });
          const gs = gameStateRef.current;
          const winnerName = gs?.players.find((p) => p.id === winnerId)?.username || 'Someone';
          addLog(`Game Over! ${winnerName} wins!`, 'system');

          // Room status güncelle (host)
          if (userId === getHostId() && roomIdRef.current) {
            updateRoomStatus(roomIdRef.current, 'finished');
          }
          break;
        }

        case 'turn:timeout': {
          const { playerId } = event.payload;
          const gs = gameStateRef.current;
          if (!gs || gs.status !== 'active') break;

          const playerName = gs.players.find((p) => p.id === playerId)?.username || 'Someone';
          addLog(`${playerName}'s time ran out!`, 'timer');

          // Host otomatik hamle yapar
          if (userId === getHostId()) {
            if (gs.lastBid) {
              // Otomatik LIAR çağrısı
              sendEventRef.current({ type: 'bid:liar', payload: { callerId: playerId } });
            } else {
              // Round'un ilk hamlesi — minimum bid (1x 2)
              sendEventRef.current({
                type: 'bid:make',
                payload: { playerId, quantity: 1, value: 2 },
              });
            }
          }
          break;
        }

        case 'player:eliminated': {
          const { playerId } = event.payload;
          setGameState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === playerId ? { ...p, isEliminated: true } : p
              ),
            };
          });
          break;
        }

        case 'player:disconnected': {
          const { playerId } = event.payload;
          const gs = gameStateRef.current;
          if (!gs) break;

          // Bot oyuncuları disconnect'ten muaf tut
          const dcPlayer = gs.players.find((p) => p.id === playerId);
          if (!dcPlayer || dcPlayer.isEliminated) break;
          if ('isBot' in dcPlayer && dcPlayer.isBot) break;

          const dcName = dcPlayer.username || 'Someone';
          addLog(`${dcName} disconnected — eliminated!`, 'system');

          // Oyuncuyu disconnected + eliminated olarak işaretle
          setGameState((prev) => {
            if (!prev) return prev;
            const updatedPlayers = prev.players.map((p) =>
              p.id === playerId ? { ...p, isDisconnected: true, isEliminated: true } : p
            );

            // Eleme sırasına ekle
            eliminationOrderRef.current.push(playerId);

            // Kazanan kontrolü
            const alive = updatedPlayers.filter((p) => !p.isEliminated);
            if (alive.length <= 1 && prev.status !== 'finished') {
              const winnerId = alive[0]?.id || null;
              if (userId === getHostId()) {
                setTimeout(() => {
                  sendEventRef.current({
                    type: 'game:end',
                    payload: { winnerId: winnerId || '' },
                  });
                }, 2000);
              }
              return { ...prev, players: updatedPlayers, status: 'finished', winnerId };
            }

            // Sırası bu oyuncudaysa, sırayı sonrakine geç
            if (prev.currentTurnPlayerId === playerId) {
              const nextTurn = getNextTurnPlayerId(
                turnOrderRef.current,
                playerId,
                updatedPlayers
              );
              // Host yeni turu başlatsın
              if (userId === getHostId()) {
                sendEventRef.current({
                  type: 'bid:make',
                  payload: { playerId: '__skip__', quantity: 0, value: 0, skipTo: nextTurn },
                });
              }
              return { ...prev, players: updatedPlayers, currentTurnPlayerId: nextTurn };
            }

            return { ...prev, players: updatedPlayers };
          });

          // Host: DB'yi güncelle
          if (userId === getHostId() && roomIdRef.current) {
            const updatedGs = gameStateRef.current;
            if (updatedGs) {
              updateGameState(roomIdRef.current, {
                players: updatedGs.players,
                current_turn_player_id: updatedGs.currentTurnPlayerId,
              });
            }
          }
          break;
        }
      }
    },
    [userId, addLog, clearTurnTimer, startTurnTimer, computeRankings]
  );

  const { sendEvent, onlinePlayers } = useGameChannel(roomCode, handleEvent, userId, username);
  const sendEventRef = useRef(sendEvent);
  sendEventRef.current = sendEvent;

  // myDice ref (LIAR reveal'da kullanmak için)
  const myDiceRef = useRef(myDice);
  myDiceRef.current = myDice;

  // Bot turn zamanlayıcı (host tarafında çalışır)
  const botTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleBotTurn = useCallback((gs: GameState) => {
    if (botTurnTimerRef.current) {
      clearTimeout(botTurnTimerRef.current);
    }

    const botPlayer = gs.players.find((p) => p.id === gs.currentTurnPlayerId);
    if (!botPlayer || !botPlayer.isBot || botPlayer.isEliminated) return;

    const botDice = botDiceRef.current.get(botPlayer.id) || [];
    const totalDice = gs.players
      .filter((p) => !p.isEliminated)
      .reduce((sum, p) => sum + p.diceCount, 0);

    botTurnTimerRef.current = setTimeout(() => {
      const decision = decideBotAction(
        botDice,
        gs.lastBid,
        totalDice,
        gs.settings.jokerRule
      );

      if (decision.action === 'liar' && gs.lastBid) {
        sendEventRef.current({
          type: 'bid:liar',
          payload: { callerId: botPlayer.id },
        });
      } else if (decision.bid) {
        sendEventRef.current({
          type: 'bid:make',
          payload: {
            playerId: botPlayer.id,
            quantity: decision.bid.quantity,
            value: decision.bid.value,
          },
        });
      }
    }, getBotDelay());
  }, []);

  // Host ID'yi bul
  const hostIdRef = useRef<string>('');
  const getHostId = useCallback(() => hostIdRef.current, []);

  // Oyunu başlat veya recovery yap
  useEffect(() => {
    if (!roomCode || !userId) return;

    async function initGame() {
      try {
        // Room bilgisini çek
        const room = await fetchRoom(roomCode);
        if (!room) return;
        roomIdRef.current = room.id;
        hostIdRef.current = room.host_id;

        // Mevcut game state var mı? (recovery)
        const existing = await fetchGameState(room.id);
        if (existing && existing.status !== 'finished') {
          // Recovery: mevcut state'i yükle
          const settings = room.settings as RoomSettings;
          const gs: GameState = {
            roomCode,
            players: existing.players,
            currentTurnPlayerId: existing.current_turn_player_id,
            round: existing.round,
            lastBid: existing.last_bid,
            status: existing.status as GameState['status'],
            settings,
            winnerId: existing.winner_id,
          };
          setGameState(gs);
          settingsRef.current = settings;
          turnOrderRef.current = existing.turn_order;

          // Kendi zarlarımı at (recovery'de zarlar kaybolmuş olabilir)
          const me = gs.players.find((p) => p.id === userId);
          if (me && !me.isEliminated) {
            setMyDice(rollDice(me.diceCount));
          }

          // Timer'ı başlat (recovery sonrası)
          if (settings.turnTimer > 0 && gs.status === 'active') {
            startTurnTimer(settings.turnTimer);
          }

          addLog('Reconnected to game', 'system');
          setLoading(false);
          return;
        }

        // Host ise oyunu başlat
        if (room.host_id === userId) {
          const settings = room.settings as RoomSettings;
          const gsRow = await createGameState(room.id, settings);

          const gs: GameState = {
            roomCode,
            players: gsRow.players,
            currentTurnPlayerId: gsRow.current_turn_player_id,
            round: 1,
            lastBid: null,
            status: 'active',
            settings,
            winnerId: null,
          };

          turnOrderRef.current = gsRow.turn_order;
          settingsRef.current = settings;

          // Biraz bekle — diğer oyuncular kanala bağlansın
          setTimeout(() => {
            sendEventRef.current({ type: 'game:start', payload: gs });
          }, 1500);
        } else {
          // Host olmayan oyuncular game:start event'ini bekler
          setLoading(true);

          // Fallback: 5sn sonra hâlâ yüklenmediyse DB'den kontrol et
          // (game:start broadcast'i kaçırılmış olabilir)
          fallbackTimerRef.current = setTimeout(async () => {
            if (!gameStateRef.current) {
              try {
                const gs = await fetchGameState(room.id);
                if (gs && gs.status !== 'finished') {
                  const settings = room.settings as RoomSettings;
                  const recovered: GameState = {
                    roomCode,
                    players: gs.players,
                    currentTurnPlayerId: gs.current_turn_player_id,
                    round: gs.round,
                    lastBid: gs.last_bid,
                    status: gs.status as GameState['status'],
                    settings,
                    winnerId: gs.winner_id,
                  };
                  setGameState(recovered);
                  settingsRef.current = settings;
                  turnOrderRef.current = gs.turn_order;

                  const me = recovered.players.find((p) => p.id === userId);
                  if (me && !me.isEliminated) {
                    setMyDice(rollDice(me.diceCount));
                  }
                  if (settings.turnTimer > 0 && recovered.status === 'active') {
                    startTurnTimer(settings.turnTimer);
                  }
                  addLog('Connected to game (fallback)', 'system');
                  setLoading(false);
                }
              } catch {
                // Sessizce devam et, event'i beklemeye devam
              }
            }
          }, 5000);
        }
      } catch (err) {
        console.error('Failed to init game:', err);
      }
    }

    initGame();

    // Cleanup timer'ları
    return () => {
      clearTurnTimer();
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      if (botTurnTimerRef.current) {
        clearTimeout(botTurnTimerRef.current);
      }
    };
  }, [roomCode, userId, addLog, startTurnTimer, clearTurnTimer]);

  // Yeni round başlat (host çağırır)
  const startNewRound = useCallback(
    async (loserId: string) => {
      const gs = gameStateRef.current;
      if (!gs || !userId) return;

      const activePlayers = gs.players.filter((p) => !p.isEliminated);
      if (activePlayers.length <= 1) return; // Oyun bitti

      const newRound = gs.round + 1;
      // Kaybeden ilk sırayı alır (eliminated değilse)
      const loserStillAlive = activePlayers.some((p) => p.id === loserId);
      const firstTurn = loserStillAlive
        ? loserId
        : getNextTurnPlayerId(turnOrderRef.current, loserId, activePlayers);

      // Yeni round state
      const updatedPlayers = gs.players.map((p) => ({
        ...p,
        dice: [], // Zarlar sıfırlanacak
      }));

      const newState: GameState = {
        ...gs,
        players: updatedPlayers,
        currentTurnPlayerId: firstTurn,
        round: newRound,
        lastBid: null,
        status: 'active',
      };

      // DB güncelle
      if (roomIdRef.current) {
        await updateGameState(roomIdRef.current, {
          players: updatedPlayers,
          current_turn_player_id: firstTurn,
          round: newRound,
          last_bid: null,
          status: 'active',
        });
      }

      // Zarları sıfırla
      collectedDiceRef.current.clear();
      setRevealedDice(null);
      setRoundResult(null);

      // Broadcast
      sendEventRef.current({ type: 'game:start', payload: newState });
    },
    [userId]
  );

  // Bid yap
  const makeBid = useCallback(
    (quantity: number, value: number) => {
      const gs = gameStateRef.current;
      if (!gs || !userId || gs.currentTurnPlayerId !== userId) return;
      if (gs.status !== 'active') return;

      const newBid: Bid = { playerId: userId, quantity, value };
      if (!isValidBid(newBid, gs.lastBid)) return;

      sendEventRef.current({ type: 'bid:make', payload: newBid });

      // Host ise DB güncelle
      if (userId === hostIdRef.current && roomIdRef.current) {
        const nextTurn = getNextTurnPlayerId(
          turnOrderRef.current,
          userId,
          gs.players
        );
        updateGameState(roomIdRef.current, {
          last_bid: newBid,
          current_turn_player_id: nextTurn,
        });
      }
    },
    [userId]
  );

  // LIAR çağır
  const callLiar = useCallback(() => {
    const gs = gameStateRef.current;
    if (!gs || !userId || gs.currentTurnPlayerId !== userId) return;
    if (!gs.lastBid) return;
    if (gs.status !== 'active') return;

    sendEventRef.current({ type: 'bid:liar', payload: { callerId: userId } });
  }, [userId]);

  // Zarlarımı gönder (dice:reveal için)
  const sendMyDice = useCallback(() => {
    if (!userId) return;
    sendEventRef.current({
      type: 'dice:reveal',
      payload: { players: [{ id: userId, dice: myDiceRef.current }] },
    });
  }, [userId]);

  return {
    gameState,
    myDice,
    isMyTurn,
    isHost: hostIdRef.current === userId,
    gameLog,
    revealedDice,
    roundResult,
    turnTimeLeft,
    rankings,
    roomId: roomIdRef.current,
    hostId: hostIdRef.current,
    loading,
    makeBid,
    callLiar,
    sendMyDice,
  };
}
