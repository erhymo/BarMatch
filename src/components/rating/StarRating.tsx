'use client';

import { useState } from 'react';

interface StarRatingProps {
  /** Current rating value (0-5). Can be fractional for averages. */
  value: number;
  /** Total number of ratings (optional, for display). */
  totalRatings?: number;
  /** Called when user selects a rating (1-5). If not provided, component is read-only. */
  onChange?: (rating: number) => void;
  /** Optional label shown next to the rating. */
  label?: string;
  /** Size of the stars. */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export default function StarRating({
  value,
  totalRatings,
  onChange,
  label,
  size = 'md',
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const isInteractive = typeof onChange === 'function';

  const displayValue = hovered !== null ? hovered : value;
  const roundedDisplay = Math.round(displayValue);

  const handleClick = (rating: number) => {
    if (!isInteractive) return;
    onChange?.(rating);
  };

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-sm text-zinc-600 dark:text-zinc-400 mr-1">
          {label}
        </span>
      )}

      <div className="flex items-center" aria-label="Stjernerating" role={isInteractive ? 'slider' : 'img'}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => isInteractive && setHovered(star)}
            onMouseLeave={() => isInteractive && setHovered(null)}
            className={`focus:outline-none ${
              isInteractive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            }`}
            aria-label={isInteractive ? `${star} stjerner` : undefined}
          >
            <span
              className={`${sizeClasses[size]} ${
                star <= roundedDisplay
                  ? 'text-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.7)]'
                  : 'text-zinc-300 dark:text-zinc-700'
              }`}
            >
              ★
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {value > 0 ? value.toFixed(1) : '–'}
        </span>
        {typeof totalRatings === 'number' && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ({totalRatings})
          </span>
        )}
      </div>
    </div>
  );
}

