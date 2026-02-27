'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dice from '@/components/ui/Dice';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useGameState } from '@/hooks/useGameState';
import { useChat } from '@/hooks/useChat';
import { isValidBid } from '@/lib/game-logic';
import { APP_CONFIG } from '@/lib/config';

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isReady: authReady } = useRequireAuth();
  const roomCode = (params.code as string)?.toUpperCase() || '';

  // Oyun state hook'u
  const {
    gameState,
    myDice,
    isMyTurn,
    gameLog,
    revealedDice,
    roundResult,
    turnTimeLeft,
    rankings,
    roomId,
    isHost,
    loading,
    makeBid,
    callLiar,
  } = useGameState(roomCode, user?.id, user?.username || undefined);

  // Chat hook
  const {
    messages: chatMessages,
    unreadCount,
    sendMessage: sendChatMsg,
    sendSystemMsg,
    clearUnread,
  } = useChat(roomCode, roomId || null, user?.id, user?.username || undefined);

  // Sistem mesajları: host oyun eventlerini chat'e yazar
  const prevLogLenRef = useRef(0);
  useEffect(() => {
    if (!isHost || gameLog.length === 0) return;
    // Sadece yeni eklenen log'ları chat'e gönder
    const newCount = gameLog.length - prevLogLenRef.current;
    if (newCount > 0 && prevLogLenRef.current > 0) {
      // gameLog en yeni başta → ilk newCount entry yeni
      const newEntries = gameLog.slice(0, newCount);
      for (const entry of newEntries) {
        if (['liar', 'round', 'elimination', 'system'].includes(entry.type)) {
          sendSystemMsg(entry.message);
        }
      }
    }
    prevLogLenRef.current = gameLog.length;
  }, [gameLog.length, isHost, sendSystemMsg, gameLog]);

  // Teklif paneli state
  const [bidQuantity, setBidQuantity] = useState(1);
  const [selectedDiceValue, setSelectedDiceValue] = useState(2);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Chat açıldığında unread sıfırla
  function handleChatToggle() {
    if (!chatOpen) {
      clearUnread();
    }
    setChatOpen(!chatOpen);
  }

  // Chat mesajı gönder
  function handleSendChat() {
    if (!chatInput.trim()) return;
    sendChatMsg(chatInput);
    setChatInput('');
  }

  // Auto-scroll: yeni mesaj geldiğinde aşağı kay
  useEffect(() => {
    if (chatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, chatOpen]);

  // Rakipler (kendim hariç)
  const opponents = useMemo(() => {
    if (!gameState) return [];
    return gameState.players.filter((p) => p.id !== user?.id);
  }, [gameState, user?.id]);

  // Toplam zar sayısı
  const totalDice = useMemo(() => {
    if (!gameState) return 0;
    return gameState.players.reduce((sum, p) => sum + p.diceCount, 0);
  }, [gameState]);

  // Hayatta kalan oyuncu sayısı
  const alivePlayers = useMemo(() => {
    if (!gameState) return 0;
    return gameState.players.filter((p) => !p.isEliminated).length;
  }, [gameState]);

  // Sırası olan oyuncunun adı
  const currentTurnName = useMemo(() => {
    if (!gameState) return '';
    if (gameState.currentTurnPlayerId === user?.id) return 'You';
    return gameState.players.find((p) => p.id === gameState.currentTurnPlayerId)?.username || '?';
  }, [gameState, user?.id]);

  // Son teklif bilgisi
  const lastBidInfo = useMemo(() => {
    if (!gameState?.lastBid) return null;
    const bidder = gameState.players.find((p) => p.id === gameState.lastBid!.playerId);
    return {
      username: bidder?.username || '?',
      quantity: gameState.lastBid.quantity,
      value: gameState.lastBid.value,
    };
  }, [gameState]);

  // Teklif geçerli mi?
  const canMakeBid = useMemo(() => {
    if (!isMyTurn || gameState?.status !== 'active') return false;
    return isValidBid(
      { playerId: user?.id || '', quantity: bidQuantity, value: selectedDiceValue },
      gameState?.lastBid || null
    );
  }, [isMyTurn, gameState, bidQuantity, selectedDiceValue, user?.id]);

  // LIAR diyebilir mi?
  const canCallLiar = isMyTurn && gameState?.status === 'active' && !!gameState.lastBid;

  // Kazanan bilgisi
  const winner = useMemo(() => {
    if (!gameState || gameState.status !== 'finished' || !gameState.winnerId) return null;
    return gameState.players.find((p) => p.id === gameState.winnerId);
  }, [gameState]);

  // Reveal'da bir oyuncunun zarlarını bul
  function getRevealedDiceFor(playerId: string): number[] | null {
    if (!revealedDice) return null;
    return revealedDice.find((r) => r.id === playerId)?.dice || null;
  }

  // Timer rengi (son 5sn kırmızı)
  function getTimerColor(): string {
    if (turnTimeLeft === null) return '';
    if (turnTimeLeft <= 5) return 'text-pirate-red-light';
    if (turnTimeLeft <= 10) return 'text-gold-light';
    return 'text-text-primary';
  }

  function handleMakeBid() {
    if (!canMakeBid) {
      showToast('Invalid bid — quantity or value must increase');
      return;
    }
    makeBid(bidQuantity, selectedDiceValue);
  }

  function handleCallLiar() {
    if (!canCallLiar) return;
    callLiar();
  }

  // Loading ekranı
  if (!authReady || loading) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
        <p className="text-text-muted text-sm">
          {!authReady ? 'Authenticating...' : 'Waiting for game to start...'}
        </p>
      </main>
    );
  }

  // Oyun state henüz yüklenmedi
  if (!gameState) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
        <p className="text-text-muted text-sm">Loading game...</p>
      </main>
    );
  }

  // Oyun bitti ekranı
  if (gameState.status === 'finished' && winner) {
    const isWinner = winner.id === user?.id;

    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[500px] animate-fade-in text-center">
          <Card gold className="py-8">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-gold-light mb-2">
              Game Over!
            </h2>
            <p className="text-2xl font-bold text-text-bright mb-1">
              {isWinner ? 'You Win!' : `${winner.username} Wins!`}
            </p>
            <p className="text-text-muted text-sm mb-6">
              After {gameState.round} rounds of bluffing
            </p>

            {/* Sıralama tablosu */}
            {rankings.length > 0 && (
              <div className="mb-6">
                <h4 className="text-text-muted text-xs uppercase tracking-wider mb-3">Final Standings</h4>
                <div className="flex flex-col gap-1.5">
                  {rankings.map((r) => (
                    <div
                      key={r.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                        r.rank === 1
                          ? 'bg-gold/10 border border-border-gold'
                          : 'bg-pirate-bg-medium border border-border-pirate'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-sm min-w-[24px] ${
                          r.rank === 1 ? 'text-gold-light' :
                          r.rank === 2 ? 'text-text-primary' :
                          'text-text-muted'
                        }`}>
                          #{r.rank}
                        </span>
                        <span className={`text-sm ${r.id === user?.id ? 'font-semibold text-text-bright' : 'text-text-primary'}`}>
                          {r.username}
                          {r.id === user?.id && <span className="text-text-muted text-xs ml-1">(you)</span>}
                        </span>
                      </div>
                      {r.rank === 1 && <Badge variant="gold">Winner</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={() => router.push('/lobby')}>
              Back to Lobby
            </Button>
          </Card>

          {/* Son oyun logu */}
          <Card className="mt-4 max-h-[200px] overflow-y-auto">
            <h4 className="text-text-muted text-xs uppercase tracking-wider mb-2">Game Log</h4>
            <ul className="flex flex-col gap-1 text-xs text-text-secondary">
              {gameLog.slice(0, 20).map((entry) => (
                <li
                  key={entry.id}
                  className={`py-1 border-b border-border-pirate/50 ${
                    entry.type === 'elimination' ? 'text-pirate-red-light' :
                    entry.type === 'system' ? 'text-gold-light' : ''
                  }`}
                >
                  {entry.message}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </main>
    );
  }

  // Ana oyun ekranı
  const isRevealing = gameState.status === 'revealing' || revealedDice !== null;
  const myPlayer = gameState.players.find((p) => p.id === user?.id);
  const amEliminated = myPlayer?.isEliminated ?? false;

  return (
    <main className="min-h-dvh flex flex-col items-center p-2 pt-2">
      <div className="w-full max-w-[600px] flex flex-col gap-2 animate-fade-in">
        {/* Oyun bilgi bar */}
        <Card className="py-2 px-3">
          <div className="flex justify-between items-center text-xs">
            <div>
              <span className="text-text-muted">Round </span>
              <strong className="text-gold-light">{gameState.round}</strong>
            </div>
            <div>
              <span className="text-text-muted">Players </span>
              <strong className="text-gold-light">{alivePlayers}/{gameState.players.length}</strong>
            </div>
            <div>
              <span className="text-text-muted">Dice </span>
              <strong className="text-gold-light">{totalDice}</strong>
            </div>
            {/* Turn Timer */}
            {turnTimeLeft !== null && (
              <div>
                <strong className={`text-lg font-bold ${getTimerColor()}`}>
                  {turnTimeLeft}s
                </strong>
              </div>
            )}
          </div>
          {/* Sıra bilgisi */}
          <div className="flex items-center justify-center gap-2 mt-1 pt-1 border-t border-border-pirate/50">
            <span className="text-text-muted text-xs">Turn:</span>
            <strong className={`text-sm ${isMyTurn ? 'text-pirate-green-light' : 'text-gold-light'}`}>
              {currentTurnName}
            </strong>
            {lastBidInfo && (
              <>
                <span className="text-border-pirate mx-1">|</span>
                <span className="text-text-muted text-xs">Last Bid:</span>
                <strong className="text-text-bright text-sm">
                  {lastBidInfo.quantity}x {lastBidInfo.value}&apos;s
                </strong>
                <span className="text-text-muted text-xs">by {lastBidInfo.username}</span>
              </>
            )}
          </div>
        </Card>

        {/* Round sonucu */}
        {roundResult && (
          <div className="bg-pirate-red/20 border border-pirate-red rounded-[10px] p-3 text-center animate-fade-in">
            <p className="text-pirate-red-light font-semibold text-sm">{roundResult.reason}</p>
            <p className="text-text-muted text-xs mt-1">New round starting...</p>
          </div>
        )}

        {/* Rakipler */}
        <div className={`grid gap-2 ${opponents.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {opponents.map((opp) => {
            const oppRevealed = getRevealedDiceFor(opp.id);
            const isOppTurn = gameState.currentTurnPlayerId === opp.id;
            const isLoser = roundResult?.loserId === opp.id;

            return (
              <Card
                key={opp.id}
                className={`text-center py-2 px-2 transition-all ${
                  opp.isEliminated ? 'opacity-40' : ''
                } ${isOppTurn ? 'border-gold shadow-[0_0_20px_rgba(212,160,23,0.15)]' : ''} ${
                  isLoser ? 'border-pirate-red shadow-[0_0_20px_rgba(192,57,43,0.2)]' : ''
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <p className="font-semibold text-text-primary text-sm truncate">{opp.username}</p>
                  {opp.isDisconnected && (
                    <span className="text-pirate-red-light text-[10px]" title="Disconnected">DC</span>
                  )}
                </div>
                <div className="flex justify-center gap-1 mt-1 flex-wrap">
                  {opp.isEliminated ? (
                    <span className="text-pirate-red-light text-xs">Eliminated</span>
                  ) : oppRevealed ? (
                    oppRevealed.map((val, i) => (
                      <Dice key={i} value={val} small />
                    ))
                  ) : (
                    Array.from({ length: opp.diceCount }).map((_, i) => (
                      <Dice key={i} hidden small />
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Benim zarlarım */}
        <Card gold className="text-center">
          <h4 className="text-text-muted text-xs mb-2 uppercase tracking-wider">
            Your Dice {amEliminated && '(Eliminated)'}
          </h4>
          <div className="flex justify-center gap-2">
            {amEliminated ? (
              <span className="text-pirate-red-light text-sm py-2">You have been eliminated</span>
            ) : (
              myDice.map((value, i) => (
                <Dice key={i} value={value} />
              ))
            )}
          </div>
        </Card>

        {/* Teklif paneli — sadece sıra bendeyse ve oyun aktifse */}
        {isMyTurn && gameState.status === 'active' && !amEliminated && (
          <Card className="animate-slide-up">
            <div className="flex flex-col gap-3">
              {/* Miktar */}
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-sm min-w-[60px]">Quantity:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBidQuantity(Math.max(1, bidQuantity - 1))}
                  >
                    −
                  </Button>
                  <span className="text-2xl font-bold text-gold-light min-w-[40px] text-center">
                    {bidQuantity}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBidQuantity(bidQuantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Zar değeri */}
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-sm min-w-[60px]">Value:</span>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((val) => (
                    <Dice
                      key={val}
                      value={val}
                      selected={selectedDiceValue === val}
                      onClick={() => setSelectedDiceValue(val)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Aksiyon butonları */}
            <div className="flex gap-2 mt-4">
              <Button fullWidth onClick={handleMakeBid} disabled={!canMakeBid}>
                Make Bid
              </Button>
              {canCallLiar && (
                <Button fullWidth variant="danger" onClick={handleCallLiar}>
                  LIAR!
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Sıra başkasındaysa bekle mesajı */}
        {!isMyTurn && gameState.status === 'active' && !amEliminated && (
          <div className="text-center py-3 text-text-muted text-sm">
            Waiting for <strong className="text-gold-light">{currentTurnName}</strong> to make a move...
            {turnTimeLeft !== null && (
              <span className={`ml-2 font-bold ${getTimerColor()}`}>{turnTimeLeft}s</span>
            )}
          </div>
        )}

        {/* Reveal durumu */}
        {isRevealing && !roundResult && (
          <div className="text-center py-3 text-gold-light text-sm animate-fade-in">
            Revealing all dice...
          </div>
        )}

        {/* Oyun logu */}
        <Card className="max-h-[200px] overflow-y-auto">
          <h4 className="text-text-muted text-xs uppercase tracking-wider mb-2">Game Log</h4>
          {gameLog.length === 0 ? (
            <p className="text-text-muted text-xs italic text-center py-2">Game starting...</p>
          ) : (
            <ul className="flex flex-col gap-1 text-xs text-text-secondary">
              {gameLog.slice(0, 50).map((entry) => (
                <li
                  key={entry.id}
                  className={`py-1 border-b border-border-pirate/50 ${
                    entry.type === 'elimination' ? 'text-pirate-red-light' :
                    entry.type === 'liar' ? 'text-pirate-red-light font-semibold' :
                    entry.type === 'system' ? 'text-gold-light' :
                    entry.type === 'round' ? 'text-pirate-blue' :
                    entry.type === 'timer' ? 'text-gold italic' : ''
                  }`}
                >
                  {entry.message}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Chat toggle */}
        <button
          onClick={handleChatToggle}
          className="fixed bottom-4 right-4 w-12 h-12 bg-pirate-card border border-border-gold rounded-full flex items-center justify-center text-lg shadow-lg z-[100] hover:scale-105 transition-transform"
        >
          💬
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-pirate-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Chat panel */}
        <div className={`fixed bottom-0 right-0 w-full max-w-[360px] h-[50vh] bg-pirate-card border-t border-l border-border-gold rounded-tl-2xl flex flex-col z-[200] transition-transform duration-250 ${chatOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-pirate">
            <h4 className="text-sm font-semibold text-gold-light">Chat</h4>
            <button onClick={() => setChatOpen(false)} className="text-text-muted hover:text-text-primary">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 text-xs space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-text-muted italic text-center py-8">No messages yet...</p>
            ) : (
              chatMessages.map((msg) => {
                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="text-center">
                      <span className="text-gold-light italic text-[11px]">{msg.message}</span>
                    </div>
                  );
                }
                const isMe = msg.playerId === user?.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-text-muted text-[10px] mb-0.5">{msg.username}</span>
                    <div className={`max-w-[80%] px-3 py-1.5 rounded-lg ${
                      isMe
                        ? 'bg-gold/20 border border-border-gold text-text-bright'
                        : 'bg-pirate-bg-medium border border-border-pirate text-text-primary'
                    }`}>
                      <p className="text-xs break-words">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 p-2 border-t border-border-pirate">
            <input
              className="flex-1 px-3 py-2 bg-pirate-bg-medium border border-border-pirate rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold"
              placeholder="Type a message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              maxLength={APP_CONFIG.maxChatMessageLength}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
            />
            <Button size="sm" onClick={handleSendChat} disabled={!chatInput.trim()}>
              Send
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
