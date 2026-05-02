'use client';

import { cn } from '@/lib/utils';
import { FUEL_TYPES } from '@/lib/data';
import { useT } from '@/lib/locale-store';
import type { TranslationKey } from '@/lib/i18n';

interface FuelChipsProps {
  selected: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FuelChips({ selected, onChange, className }: FuelChipsProps) {
  const t = useT();
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1 scrollbar-hide', className)}>
      {FUEL_TYPES.map((fuel) => (
        <button
          key={fuel.id}
          onClick={() => onChange(fuel.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            selected === fuel.id
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
          )}
        >
          {t(`fuel.${fuel.id}` as TranslationKey)}
        </button>
      ))}
    </div>
  );
}
