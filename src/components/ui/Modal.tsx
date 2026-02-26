'use client';

import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-pirate-card border border-border-gold rounded-2xl p-6 w-full max-w-[400px] shadow-lg shadow-gold/10 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
