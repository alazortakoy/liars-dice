'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dice from '@/components/ui/Dice';
import { useToast } from '@/components/ui/Toast';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { rollDice } from '@/lib/game-logic';

export default function GamePage() {
  const params = useParams();
  const { showToast } = useToast();
  const { user, isReady: authReady } = useRequireAuth();
  const roomCode = (params.code as string)?.toUpperCase() || '';

  // Demo state — TODO: Faz 5'te Realtime ile senkronize edilecek
  const [myDice] = useState(() => rollDice(5));
  const [bidQuantity, setBidQuantity] = useState(1);
  const [selectedDiceValue, setSelectedDiceValue] = useState(6);
  const [chatOpen, setChatOpen] = useState(false);

  const username = user?.username || 'You';

  // Mock rakipler
  const opponents = [
    { id: '2', username: 'BlackBeard', diceCount: 5, isEliminated: false, isActive: false },
    { id: '3', username: 'DavyJones', diceCount: 4, isEliminated: false, isActive: false },
    { id: '4', username: 'JackSparrow', diceCount: 0, isEliminated: true, isActive: false },
  ];

  function handleMakeBid() {
    showToast(`Bid: ${bidQuantity}x ${selectedDiceValue}'s — Coming soon!`);
  }

  function handleCallLiar() {
    showToast('LIAR! — Coming soon!');
  }

  if (!authReady) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-border-pirate border-t-gold rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center p-2 pt-2">
      <div className="w-full max-w-[600px] flex flex-col gap-2 animate-fade-in">
        {/* Oyun bilgi bar */}
        <Card className="flex justify-between items-center py-2 px-3 text-xs">
          <div>
            <span className="text-text-muted">Round </span>
            <strong className="text-gold-light">3</strong>
          </div>
          <div>
            <span className="text-text-muted">Last Bid: </span>
            <strong className="text-gold-light">3x 5&apos;s</strong>
          </div>
          <div>
            <span className="text-text-muted">Turn: </span>
            <strong className="text-gold-light">{username}</strong>
          </div>
          <div>
            <span className="text-text-muted">Total Dice: </span>
            <strong className="text-gold-light">14</strong>
          </div>
        </Card>

        {/* Rakipler */}
        <div className="grid grid-cols-3 gap-2">
          {opponents.map((opp) => (
            <Card
              key={opp.id}
              className={`text-center py-2 px-2 ${opp.isEliminated ? 'opacity-40' : ''} ${opp.isActive ? 'border-gold shadow-[0_0_20px_rgba(212,160,23,0.15)]' : ''}`}
            >
              <p className="font-semibold text-text-primary text-sm truncate">{opp.username}</p>
              <div className="flex justify-center gap-1 mt-1">
                {Array.from({ length: opp.diceCount }).map((_, i) => (
                  <Dice key={i} hidden small />
                ))}
                {opp.isEliminated && <span className="text-pirate-red-light text-xs">Eliminated</span>}
              </div>
            </Card>
          ))}
        </div>

        {/* Benim zarlarım */}
        <Card gold className="text-center">
          <h4 className="text-text-muted text-xs mb-2 uppercase tracking-wider">Your Dice</h4>
          <div className="flex justify-center gap-2">
            {myDice.map((value, i) => (
              <Dice key={i} value={value} />
            ))}
          </div>
        </Card>

        {/* Son teklif */}
        <div className="bg-pirate-bg-medium border border-border-pirate rounded-[10px] p-3 text-center">
          <span className="text-text-muted text-sm">Last bid by </span>
          <strong className="text-gold-light">BlackBeard</strong>
          <span className="text-text-muted text-sm">: </span>
          <strong className="text-text-bright text-lg">3x</strong>
          <span className="text-text-muted text-sm"> of </span>
          <strong className="text-text-bright text-lg">5&apos;s</strong>
        </div>

        {/* Teklif paneli */}
        <Card>
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
            <Button fullWidth onClick={handleMakeBid}>
              ✓ Make Bid
            </Button>
            <Button fullWidth variant="danger" onClick={handleCallLiar}>
              🏴‍☠️ LIAR!
            </Button>
          </div>
        </Card>

        {/* Oyun logu */}
        <Card className="max-h-[200px] overflow-y-auto">
          <h4 className="text-text-muted text-xs uppercase tracking-wider mb-2">Game Log</h4>
          <ul className="flex flex-col gap-1 text-xs text-text-secondary">
            <li className="py-1 border-b border-border-pirate/50">BlackBeard bid 3x 5&apos;s</li>
            <li className="py-1 border-b border-border-pirate/50">DavyJones bid 2x 4&apos;s</li>
            <li className="py-1 border-b border-border-pirate/50">Round 3 started — 14 dice on the table</li>
            <li className="py-1 border-b border-border-pirate/50 text-pirate-red-light">JackSparrow eliminated! Lost last die.</li>
            <li className="py-1">Round 2 — {username} called LIAR! JackSparrow had bluffed. JackSparrow loses a die.</li>
          </ul>
        </Card>

        {/* Chat toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-4 right-4 w-12 h-12 bg-pirate-card border border-border-gold rounded-full flex items-center justify-center text-lg shadow-lg z-[100] hover:scale-105 transition-transform"
        >
          💬
        </button>

        {/* Chat panel */}
        <div className={`fixed bottom-0 right-0 w-full max-w-[360px] h-[50vh] bg-pirate-card border-t border-l border-border-gold rounded-tl-2xl flex flex-col z-[200] transition-transform duration-250 ${chatOpen ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-pirate">
            <h4 className="text-sm font-semibold text-gold-light">Chat</h4>
            <button onClick={() => setChatOpen(false)} className="text-text-muted hover:text-text-primary">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 text-xs">
            <p className="text-text-muted italic text-center py-8">Chat coming in Phase 7...</p>
          </div>
          <div className="flex gap-2 p-2 border-t border-border-pirate">
            <input
              className="flex-1 px-3 py-2 bg-pirate-bg-medium border border-border-pirate rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold"
              placeholder="Type a message..."
              disabled
            />
            <Button size="sm" disabled>Send</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
