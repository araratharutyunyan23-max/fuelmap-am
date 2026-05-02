'use client';

import { useLocale } from '@/lib/locale-store';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

const LANGS = [
  { id: 'hy' as const, label: 'ՀԱՅ' },
  { id: 'ru' as const, label: 'RU' },
];

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();

  return (
    <div className={cn('flex items-center bg-slate-100 rounded-full p-0.5', className)}>
      {LANGS.map((lang) => (
        <button
          key={lang.id}
          onClick={() => setLocale(lang.id)}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full transition-colors',
            locale === lang.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
