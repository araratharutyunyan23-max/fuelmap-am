'use client';

import { useEffect, useState } from 'react';
import { MapPin, Droplets } from 'lucide-react';
import { useLocale } from '@/lib/locale-store';
import { track } from '@/lib/analytics';

const PICKED_KEY = 'fuelmap.locale.picked.v1';

// Detect what the browser is set to. We pre-select that one in the
// modal so the user just has to confirm — no extra reading required.
function guessBrowserLocale(): 'ru' | 'hy' {
  if (typeof navigator === 'undefined') return 'ru';
  const langs = (navigator.languages?.length ? navigator.languages : [navigator.language]) as string[];
  for (const l of langs) {
    if (l?.toLowerCase().startsWith('hy')) return 'hy';
  }
  return 'ru';
}

export function LanguagePickerModal() {
  const { setLocale } = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const picked = window.localStorage.getItem(PICKED_KEY);
    if (picked) return;
    setShow(true);
  }, []);

  if (!show) return null;

  const choose = (locale: 'ru' | 'hy') => {
    setLocale(locale);
    window.localStorage.setItem(PICKED_KEY, locale);
    track('language_picked', { locale, browser_default: guessBrowserLocale() });
    setShow(false);
  };

  const browserLocale = guessBrowserLocale();

  return (
    <div className="fixed inset-0 z-[5000] bg-white flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <MapPin className="w-10 h-10 text-emerald-600" />
          <Droplets className="w-4 h-4 text-orange-500 absolute -bottom-1 -right-1" />
        </div>
        <span className="text-2xl font-bold text-slate-900">
          FuelMap <span className="text-emerald-600">Armenia</span>
        </span>
      </div>

      <p className="text-slate-500 text-center mb-10 text-sm">
        Выберите язык · Ընտրեք լեզուն
      </p>

      <div className="w-full max-w-xs space-y-3">
        <LanguageButton
          label="Русский"
          sub="Russian"
          highlighted={browserLocale === 'ru'}
          onClick={() => choose('ru')}
        />
        <LanguageButton
          label="Հայերեն"
          sub="Armenian"
          highlighted={browserLocale === 'hy'}
          onClick={() => choose('hy')}
        />
      </div>

      <p className="text-xs text-slate-400 mt-8 text-center max-w-xs">
        Можно изменить позже в шапке приложения · Կարող ես փոխել ավելի ուշ
      </p>
    </div>
  );
}

function LanguageButton({
  label,
  sub,
  highlighted,
  onClick,
}: {
  label: string;
  sub: string;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-14 rounded-xl border-2 transition-colors flex items-center justify-between px-5 ${
        highlighted
          ? 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="text-left">
        <div className="text-base font-semibold text-slate-900">{label}</div>
        <div className="text-xs text-slate-400">{sub}</div>
      </div>
      <span className={highlighted ? 'text-emerald-600 text-lg' : 'text-slate-300 text-lg'}>→</span>
    </button>
  );
}
