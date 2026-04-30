'use client';

import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  selected: 'hy' | 'ru' | 'en';
  onChange?: (lang: 'hy' | 'ru' | 'en') => void;
  className?: string;
}

export function LanguageSwitcher({ selected, onChange, className }: LanguageSwitcherProps) {
  const languages = [
    { id: 'hy' as const, label: 'ՀԱՅ' },
    { id: 'ru' as const, label: 'RU' },
    { id: 'en' as const, label: 'EN' },
  ];

  return (
    <div className={cn('flex items-center bg-slate-100 rounded-full p-0.5', className)}>
      {languages.map((lang) => (
        <button
          key={lang.id}
          onClick={() => onChange?.(lang.id)}
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full transition-colors',
            selected === lang.id
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
