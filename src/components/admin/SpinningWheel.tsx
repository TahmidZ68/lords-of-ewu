import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface SpinningWheelProps {
  items: string[];
  disabled?: boolean;
  onResult: (winner: string) => void;
}

const SLICE_COLORS = [
  '#153D2B', // Forest
  '#C5A45B', // Gold
  '#1F5C3F', // Pitch Green
  '#2A2A28', // Charcoal
  '#82672D', // Deep Gold
  '#103021', // Dark Forest
];

function getSecureRandomIndex(max: number): number {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % max;
}

export function SpinningWheel({ items, disabled, onResult }: SpinningWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const count = items.length;
  const sliceAngle = count > 0 ? 360 / count : 360;

  const handleSpin = () => {
    if (spinning || disabled || count === 0) return;

    const winnerIdx = getSecureRandomIndex(count);
    const winner = items[winnerIdx];

    // Calculate target angle so winnerIdx lands at the top pointer (0 deg / 360 deg)
    const sliceCenter = winnerIdx * sliceAngle + sliceAngle / 2;
    const extraSpins = 360 * 6; // 6 full rotations
    const currentMod = rotation % 360;
    const targetMod = (360 - sliceCenter) % 360;
    const delta = (targetMod - currentMod + 360) % 360;
    const nextRotation = rotation + extraSpins + delta;

    setSpinning(true);
    setRotation(nextRotation);

    setTimeout(() => {
      setSpinning(false);
      onResult(winner);
    }, 3600);
  };

  if (count === 0) {
    return (
      <div className="flex h-72 w-72 items-center justify-center rounded-full border-4 border-dashed border-gold/50 bg-forest-800/40 text-center text-sm text-cream/70">
        No players remaining in this plot
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex items-center justify-center">
        {/* Top Pointer */}
        <div
          className="absolute -top-3 z-20 h-0 w-0 border-x-[12px] border-t-[22px] border-x-transparent border-t-gold drop-shadow-md"
          aria-hidden="true"
        />

        {/* Wheel SVG */}
        <div
          className="aspect-square w-64 sm:w-80 max-w-full rounded-full border-4 border-gold shadow-2xl overflow-hidden"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 3.5s cubic-bezier(0.12, 0.8, 0.18, 1)' : 'none',
          }}
        >
          <svg viewBox="0 0 200 200" className="h-full w-full">
            {items.map((label, idx) => {
              const startAngle = idx * sliceAngle - 90;
              const endAngle = startAngle + sliceAngle;
              const startRad = (startAngle * Math.PI) / 180;
              const endRad = (endAngle * Math.PI) / 180;

              const x1 = 100 + 100 * Math.cos(startRad);
              const y1 = 100 + 100 * Math.sin(startRad);
              const x2 = 100 + 100 * Math.cos(endRad);
              const y2 = 100 + 100 * Math.sin(endRad);
              const largeArc = sliceAngle > 180 ? 1 : 0;

              const pathData =
                count === 1
                  ? 'M 100,100 m -100,0 a 100,100 0 1,0 200,0 a 100,100 0 1,0 -200,0'
                  : `M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;

              const fill = SLICE_COLORS[idx % SLICE_COLORS.length];
              const isLight = fill === '#C5A45B';
              const midAngle = startAngle + sliceAngle / 2;

              return (
                <g key={`${label}-${idx}`}>
                  <path d={pathData} fill={fill} stroke="#F0E6CE" strokeWidth="0.6" />
                  <text
                    x="100"
                    y="100"
                    fill={isLight ? '#171717' : '#F0E6CE'}
                    fontSize={count > 12 ? '6.5' : '8'}
                    fontWeight="700"
                    textAnchor="end"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle} 100 100) translate(88 0)`}
                  >
                    {label.length > 14 ? `${label.slice(0, 12)}…` : label}
                  </text>
                </g>
              );
            })}
            <circle cx="100" cy="100" r="14" fill="#F0E6CE" stroke="#C5A45B" strokeWidth="3" />
          </svg>
        </div>
      </div>

      <Button
        variant="gold"
        size="lg"
        onClick={handleSpin}
        disabled={spinning || disabled || count === 0}
        className="min-w-[200px] font-display text-base uppercase tracking-wider"
      >
        {spinning ? 'Spinning...' : 'Spin Wheel'}
      </Button>
    </div>
  );
}
