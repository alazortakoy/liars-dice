'use client';

import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-text-muted mb-1.5">{label}</label>
      )}
      <input
        className={`
          w-full px-4 py-3 min-h-12
          bg-pirate-bg-medium border border-border-pirate rounded-md
          text-text-primary text-base
          placeholder:text-text-muted
          focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/15
          transition-colors duration-150
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
