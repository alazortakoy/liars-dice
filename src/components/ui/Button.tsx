'use client';

import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-gold to-gold-dark text-pirate-bg shadow-md hover:from-gold-light hover:to-gold hover:shadow-lg hover:shadow-gold/25',
  secondary:
    'bg-pirate-bg-light text-text-primary border border-border-pirate hover:bg-pirate-card hover:border-gold-dark',
  danger:
    'bg-gradient-to-br from-pirate-red to-red-900 text-text-bright shadow-md hover:from-pirate-red-light hover:to-pirate-red',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-pirate-bg-light',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-sm min-h-9',
  md: 'px-6 py-3.5 text-base min-h-12',
  lg: 'px-8 py-4 text-lg min-h-14',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-[10px] font-semibold cursor-pointer
        transition-all duration-150 ease-in-out
        select-none active:scale-[0.97]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
