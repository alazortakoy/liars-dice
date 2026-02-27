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

// Oyun logu kaydı
export interface GameLogEntry {
  id: string;
  message: string;
  type: 'bid' | 'liar' | 'reveal' | 'round' | 'elimination' | 'system';
  timestamp: number;
}

interface UseGameStateReturn {
  gameState: GameState | null;
  myDice: number[];
  isMyTurn: boolean;
  isHost: boolean;
  gameLog: GameLogEntry[];
  revealedDice: { id: string; dice: number[] }[] | null;
  roundResult: { loserId: string; reason: string } | null;
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
  const [loading, setLoading] = useState(true);

  // Zarları toplamak için ref (LIAR reveal sırasında)
  const collectedDiceRef = useRef<Map<string, number[]>>(new Map());
  const roomIdRef = useRef<string>('');
  const turnOrderRef = useRef<string[]>([]);
  const settingsRef = useRef<RoomSettings | null>(null);

  const isHost = gameState?.players?.[0]?.id === userId; // İlk oyuncu sıralama bakımından değil, host kontrolü aşağıda
  const isMyTurn = gameState?.currentTurnPlayerId === userId;

  // Log ekleme yardımcısı
  const addLog = useCallback((message: string, type: GameLogEntry['type']) => {
    setGameLog((prev) => [{ id: nextLogId(), message, type, timestamp: Date.now() }, ...prev]);
  }, []);

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
          if (me) {
            const dice = rollDice(me.diceCount);
            setMyDice(dice);
          }
          setRevealedDice(null);
          setRoundResult(null);
          addLog(`Round ${gs.round} started — ${gs.players.reduce((sum, p) => sum + p.diceCount, 0)} dice on the table`, 'round');
          setLoading(false);
          break;
        }

        case 'bid:make': {
          const bid = event.payload;
          setGameState((prev) => {
            if (!prev) return prev;
            const nextTurn = getNextTurnPlayerId(
              turnOrderRef.current,
              bid.playerId,
              prev.players
            );
            return { ...prev, lastBid: bid, currentTurnPlayerId: nextTurn };
          });
          const bidPlayer = gameState?.players.find((p) => p.id === bid.playerId);
          addLog(`${bidPlayer?.username || 'Someone'} bid ${bid.quantity}x ${bid.value}'s`, 'bid');
          break;
        }

        case 'bid:liar': {
          const { callerId } = event.payload;
          const callerName = gameState?.players.find((p) => p.id === callerId)?.username || 'Someone';
          addLog(`${callerName} called LIAR!`, 'liar');
          setGameState((prev) => prev ? { ...prev, status: 'revealing' } : prev);

          // Herkes zarlarını paylaşsın
          // Kendi zarlarımı gönder
          if (userId) {
            // Küçük gecikme ile zarları gönder (kanal hazır olsun)
            setTimeout(() => {
              sendEventRef.current({
                type: 'dice:reveal',
                payload: { players: [{ id: userId, dice: myDiceRef.current }] },
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
          const activePlayers = gameState?.players.filter((p) => !p.isEliminated) || [];
          const allRevealed = activePlayers.every((p) => collectedDiceRef.current.has(p.id));

          if (allRevealed) {
            // Tüm zarlar açık — göster
            const revealed = Array.from(collectedDiceRef.current.entries()).map(([id, dice]) => ({ id, dice }));
            setRevealedDice(revealed);

            // Host LIAR sonucunu hesaplar
            if (gameState && userId === getHostId() && gameState.lastBid) {
              const allDice = revealed.flatMap((r) => r.dice);
              const result = evaluateLiarCall(
                gameState.lastBid,
                allDice,
                settingsRef.current?.jokerRule ?? true
              );

              // Kaybedeni belirle
              const lastBidder = gameState.lastBid.playerId;
              const liarCaller = gameState.players.find(
                (p) => p.id === gameState.currentTurnPlayerId || p.id !== lastBidder
              );
              // LIAR diyen: currentTurnPlayerId (bid:liar gönderilmeden önceki sıradaki)
              // Aslında bid:liar'ı gönderen callerId'yi bulmamız lazım
              // round:end event'i gönder
              let loserId: string;
              let reason: string;

              if (result.bidWasCorrect) {
                // Teklif doğruydu, LIAR diyen kaybeder
                // LIAR diyen kişiyi bulmak için: en son bid yapan kişi değil, LIAR demiş kişi
                // Bunu gameState.currentTurnPlayerId ile buluyoruz (LIAR çağrıldığında sırası olan kişi)
                loserId = gameState.currentTurnPlayerId;
                reason = `Bid was correct! (${result.actualCount}x ${result.bidValue}'s found, bid was ${result.bidQuantity})`;
              } else {
                // Teklif yanlıştı, teklif yapan kaybeder
                loserId = lastBidder;
                reason = `Bid was wrong! (Only ${result.actualCount}x ${result.bidValue}'s found, bid was ${result.bidQuantity})`;
              }

              // 2sn sonra round:end gönder (zarlar görünsün)
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
          const loserName = gameState?.players.find((p) => p.id === loserId)?.username || 'Someone';
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
          setGameState((prev) =>
            prev ? { ...prev, status: 'finished', winnerId } : prev
          );
          const winnerName = gameState?.players.find((p) => p.id === winnerId)?.username || 'Someone';
          addLog(`Game Over! ${winnerName} wins!`, 'system');

          // Room status güncelle (host)
          if (userId === getHostId() && roomIdRef.current) {
            updateRoomStatus(roomIdRef.current, 'finished');
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
          setGameState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === playerId ? { ...p, isDisconnected: true } : p
              ),
            };
          });
          const dcName = gameState?.players.find((p) => p.id === playerId)?.username || 'Someone';
          addLog(`${dcName} disconnected`, 'system');
          break;
        }
      }
    },
    [gameState, userId, addLog]
  );

  const { sendEvent } = useGameChannel(roomCode, handleEvent);
  const sendEventRef = useRef(sendEvent);
  sendEventRef.current = sendEvent;

  // myDice ref (LIAR reveal'da kullanmak için)
  const myDiceRef = useRef(myDice);
  myDiceRef.current = myDice;

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
        }
      } catch (err) {
        console.error('Failed to init game:', err);
      }
    }

    initGame();
  }, [roomCode, userId, addLog]);

  // Yeni round başlat (host çağırır)
  const startNewRound = useCallback(
    async (loserId: string) => {
      if (!gameState || !userId) return;

      const activePlayers = gameState.players.filter((p) => !p.isEliminated);
      if (activePlayers.length <= 1) return; // Oyun bitti

      const newRound = gameState.round + 1;
      // Kaybeden ilk sırayı alır
      const firstTurn = loserId;

      // Yeni round state
      const updatedPlayers = gameState.players.map((p) => ({
        ...p,
        dice: [], // Zarlar sıfırlanacak
      }));

      const newState: GameState = {
        ...gameState,
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
    [gameState, userId]
  );

  // Bid yap
  const makeBid = useCallback(
    (quantity: number, value: number) => {
      if (!gameState || !userId || !isMyTurn) return;
      if (gameState.status !== 'active') return;

      const newBid: Bid = { playerId: userId, quantity, value };
      if (!isValidBid(newBid, gameState.lastBid)) return;

      sendEventRef.current({ type: 'bid:make', payload: newBid });

      // Host ise DB güncelle
      if (userId === hostIdRef.current && roomIdRef.current) {
        const nextTurn = getNextTurnPlayerId(
          turnOrderRef.current,
          userId,
          gameState.players
        );
        updateGameState(roomIdRef.current, {
          last_bid: newBid,
          current_turn_player_id: nextTurn,
        });
      }
    },
    [gameState, userId, isMyTurn]
  );

  // LIAR çağır
  const callLiar = useCallback(() => {
    if (!gameState || !userId || !isMyTurn) return;
    if (!gameState.lastBid) return;
    if (gameState.status !== 'active') return;

    sendEventRef.current({ type: 'bid:liar', payload: { callerId: userId } });
  }, [gameState, userId, isMyTurn]);

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
    loading,
    makeBid,
    callLiar,
    sendMyDice,
  };
}
