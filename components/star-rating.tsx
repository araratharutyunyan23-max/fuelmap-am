'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  className?: string;
}

const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-5 h-5',
  lg: 'w-8 h-8',
};

export function StarRating({ value, onChange, size = 'md', readOnly, className }: StarRatingProps) {
  const interactive = !readOnly && onChange;
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Tag = interactive ? 'button' : 'span';
        return (
          <Tag
            key={n}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onChange?.(n) : undefined}
            aria-label={interactive ? `Rate ${n}` : undefined}
            className={cn(
              'transition-transform',
              interactive && 'hover:scale-110 active:scale-95'
            )}
          >
            <Star
              className={cn(
                SIZES[size],
                filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
              )}
            />
          </Tag>
        );
      })}
    </div>
  );
}
