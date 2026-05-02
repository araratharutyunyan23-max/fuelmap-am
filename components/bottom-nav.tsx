'use client';

import { Map, List, Send, User, Plus } from 'lucide-react';
import { useT } from '@/lib/locale-store';
import { cn } from '@/lib/utils';

const TELEGRAM_URL = 'https://t.me/fuelmap_armenia';

interface BottomNavProps {
  active: 'map' | 'list' | 'add' | 'profile';
  onNavigate: (screen: string) => void;
}

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const t = useT();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-slate-200 px-2 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        <button
          onClick={() => onNavigate('map')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]',
            active === 'map' ? 'text-emerald-600' : 'text-slate-400'
          )}
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.map')}</span>
        </button>

        <button
          onClick={() => onNavigate('list')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]',
            active === 'list' ? 'text-emerald-600' : 'text-slate-400'
          )}
        >
          <List className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.list')}</span>
        </button>

        <button
          onClick={() => onNavigate('submit')}
          className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors"
          aria-label="Submit price"
        >
          <Plus className="w-6 h-6" />
        </button>

        <a
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px] text-slate-400 hover:text-sky-500"
        >
          <Send className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.telegram')}</span>
        </a>

        <button
          onClick={() => onNavigate('profile')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]',
            active === 'profile' ? 'text-emerald-600' : 'text-slate-400'
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t('nav.profile')}</span>
        </button>
      </div>
    </nav>
  );
}
