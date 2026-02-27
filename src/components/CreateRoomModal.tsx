'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { APP_CONFIG, TURN_TIMER_OPTIONS } from '@/lib/config';
import type { RoomSettings } from '@/types';

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (settings: RoomSettings) => Promise<void>;
}

export default function CreateRoomModal({ open, onClose, onCreate }: CreateRoomModalProps) {
  const [startingDice, setStartingDice] = useState<number>(APP_CONFIG.defaultStartingDice);
  const [jokerRule, setJokerRule] = useState(true);
  const [turnTimer, setTurnTimer] = useState<number>(APP_CONFIG.defaultTurnTimer);
  const [maxPlayers, setMaxPlayers] = useState<number>(6);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      await onCreate({ startingDice, jokerRule, turnTimer, maxPlayers });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3 className="font-[family-name:var(--font-display)] text-xl text-gold-light text-center mb-5">
        Create Room
      </h3>

      <div className="flex flex-col gap-4">
        {/* Zar sayısı */}
        <div>
          <label className="text-text-secondary text-sm block mb-2">Starting Dice</label>
          <div className="flex gap-2">
            {[3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setStartingDice(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  startingDice === n
                    ? 'bg-gold text-pirate-bg'
                    : 'bg-pirate-bg-medium text-text-secondary hover:text-text-primary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Joker kuralı */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-text-secondary text-sm">Joker Rule (1s are wild)</label>
          </div>
          <button
            onClick={() => setJokerRule(!jokerRule)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              jokerRule ? 'bg-pirate-green' : 'bg-pirate-bg-medium'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                jokerRule ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {/* Turn timer */}
        <div>
          <label className="text-text-secondary text-sm block mb-2">Turn Timer</label>
          <div className="flex gap-2">
            {TURN_TIMER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTurnTimer(opt.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  turnTimer === opt.value
                    ? 'bg-gold text-pirate-bg'
                    : 'bg-pirate-bg-medium text-text-secondary hover:text-text-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Max oyuncu */}
        <div>
          <label className="text-text-secondary text-sm block mb-2">Max Players</label>
          <div className="flex gap-2">
            {[2, 4, 6, 8].map((n) => (
              <button
                key={n}
                onClick={() => setMaxPlayers(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  maxPlayers === n
                    ? 'bg-gold text-pirate-bg'
                    : 'bg-pirate-bg-medium text-text-secondary hover:text-text-primary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Özet */}
        <div className="flex flex-wrap gap-1.5 justify-center pt-1">
          <Badge variant="gold">{startingDice} Dice</Badge>
          <Badge variant="gold">Joker: {jokerRule ? 'ON' : 'OFF'}</Badge>
          <Badge variant="gold">{turnTimer === 0 ? 'No Timer' : `${turnTimer}s`}</Badge>
          <Badge variant="gold">Max {maxPlayers}</Badge>
        </div>

        {/* Butonlar */}
        <Button fullWidth onClick={handleCreate} loading={loading}>
          Create Room
        </Button>
        <Button fullWidth variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
