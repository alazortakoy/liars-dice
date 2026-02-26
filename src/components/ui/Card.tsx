import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  gold?: boolean;
}

export default function Card({ gold = false, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`
        bg-pirate-card border rounded-[10px] p-4 shadow-sm
        ${gold ? 'border-border-gold shadow-gold/15' : 'border-border-pirate'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
