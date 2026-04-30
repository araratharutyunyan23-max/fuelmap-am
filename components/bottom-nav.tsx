'use client';

import { Map, List, History, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  active: 'map' | 'list' | 'add' | 'history' | 'profile';
  onNavigate: (screen: string) => void;
}

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  const items = [
    { id: 'map', label: 'Карта', icon: Map },
    { id: 'list', label: 'Список', icon: List },
    { id: 'add', label: '', icon: Plus, isFab: true },
    { id: 'history', label: 'История', icon: History },
    { id: 'profile', label: 'Профиль', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-slate-200 px-2 pb-safe z-50">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          
          if (item.isFab) {
            return (
              <button
                key={item.id}
                onClick={() => onNavigate('submit')}
                className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors"
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          }
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]',
                active === item.id ? 'text-emerald-600' : 'text-slate-400'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
