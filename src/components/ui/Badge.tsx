type BadgeVariant = 'gold' | 'green' | 'red';

const variantStyles: Record<BadgeVariant, string> = {
  gold: 'bg-gold/15 text-gold-light',
  green: 'bg-pirate-green/15 text-pirate-green-light',
  red: 'bg-pirate-red/15 text-pirate-red-light',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'gold', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
