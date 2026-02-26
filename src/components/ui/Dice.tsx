interface DiceProps {
  value?: number;
  hidden?: boolean;
  small?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

// Zar yüzü noktaları (dot patterns)
const dotPositions: Record<number, string[]> = {
  1: ['top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'],
  2: ['top-[20%] right-[20%]', 'bottom-[20%] left-[20%]'],
  3: ['top-[20%] right-[20%]', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-[20%] left-[20%]'],
  4: ['top-[20%] left-[20%]', 'top-[20%] right-[20%]', 'bottom-[20%] left-[20%]', 'bottom-[20%] right-[20%]'],
  5: ['top-[20%] left-[20%]', 'top-[20%] right-[20%]', 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', 'bottom-[20%] left-[20%]', 'bottom-[20%] right-[20%]'],
  6: ['top-[20%] left-[20%]', 'top-[20%] right-[20%]', 'top-1/2 left-[20%] -translate-y-1/2', 'top-1/2 right-[20%] -translate-y-1/2', 'bottom-[20%] left-[20%]', 'bottom-[20%] right-[20%]'],
};

export default function Dice({ value, hidden = false, small = false, selected = false, onClick, className = '' }: DiceProps) {
  const size = small ? 'w-8 h-8' : 'w-11 h-11';
  const dotSize = small ? 'w-1.5 h-1.5' : 'w-2 h-2';

  if (hidden) {
    return (
      <div className={`${size} bg-pirate-bg-medium border border-border-pirate rounded-md flex items-center justify-center text-text-muted text-lg ${className}`}>
        ?
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${size} relative rounded-md shadow-sm
        ${selected ? 'bg-gold border-2 border-gold ring-2 ring-gold/30' : 'bg-text-bright border border-gray-300'}
        ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}
        ${className}
      `}
    >
      {value && dotPositions[value]?.map((pos, i) => (
        <span
          key={i}
          className={`absolute ${dotSize} rounded-full ${selected ? 'bg-pirate-bg' : 'bg-pirate-bg'} ${pos}`}
        />
      ))}
    </div>
  );
}
