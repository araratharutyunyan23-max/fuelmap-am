'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Camera, Sparkles, Upload, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { FUEL_TYPES } from '@/lib/data';
import { useStations } from '@/lib/stations-store';
import { useAuth } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SubmitPriceScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  initialStationId?: string | null;
}

type SubmitState = 'idle' | 'sending' | 'sent';

export function SubmitPriceScreen({ onBack, onNavigate, initialStationId }: SubmitPriceScreenProps) {
  const { stations, loading } = useStations();
  const { user, loading: authLoading } = useAuth();

  const [stationId, setStationId] = useState<string | null>(initialStationId ?? null);
  const [stationQuery, setStationQuery] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('95');
  const [price, setPrice] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const fuelChips = FUEL_TYPES.filter((f) => ['92', '95', '98', 'diesel', 'lpg', 'cng'].includes(f.id));

  const selectedStation = useMemo(() => {
    if (stationId) return stations.find((s) => s.id === stationId) ?? null;
    return stations[0] ?? null;
  }, [stationId, stations]);

  const stationMatches = useMemo(() => {
    const q = stationQuery.trim().toLowerCase();
    if (!q) return [];
    return stations
      .filter((s) => s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q))
      .slice(0, 8);
  }, [stationQuery, stations]);

  const handleSubmit = async () => {
    setError(null);
    if (!user) {
      onNavigate('login');
      return;
    }
    if (!selectedStation || !price) return;
    const fuel = fuelChips.find((f) => f.id === selectedFuel);
    if (!fuel) return;

    setSubmitState('sending');
    const { error: err } = await supabase.from('price_reports').insert({
      user_id: user.id,
      station_id: selectedStation.id,
      fuel_type: fuel.id,
      label: fuel.label,
      price: parseInt(price, 10),
    });
    if (err) {
      setSubmitState('idle');
      setError(err.message);
      return;
    }
    setSubmitState('sent');
    setPrice('');
  };

  const submitDisabled =
    !price || !selectedStation || submitState === 'sending' || authLoading || loading;

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">Сообщить цену</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {!authLoading && !user && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Чтобы отправить цену, нужно войти.{' '}
            <button
              onClick={() => onNavigate('login')}
              className="font-semibold underline"
            >
              Войти →
            </button>
          </div>
        )}

        {/* Photo Upload Zone (placeholder; wired up in a follow-up commit) */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-emerald-400 transition-colors cursor-pointer">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-slate-700 font-medium text-center mb-2">
              Сфотографируйте табло цен
            </p>
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Upload className="w-4 h-4" />
              или выберите из галереи
            </p>
          </div>
        </div>

        {/* Station picker */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-2 block">АЗС</label>
          {selectedStation && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-3">
              <div
                className="w-1 h-10 rounded-full"
                style={{ backgroundColor: selectedStation.brandColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{selectedStation.name}</p>
                <p className="text-sm text-slate-500 truncate">{selectedStation.address}</p>
              </div>
            </div>
          )}
          <input
            type="text"
            value={stationQuery}
            onChange={(e) => setStationQuery(e.target.value)}
            placeholder="Найти другую АЗС…"
            className="w-full h-11 px-4 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {stationMatches.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {stationMatches.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStationId(s.id);
                    setStationQuery('');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                >
                  <div
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.brandColor }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fuel Type Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-3 block">Тип топлива</label>
          <div className="flex flex-wrap gap-2">
            {fuelChips.map((fuel) => (
              <button
                key={fuel.id}
                onClick={() => setSelectedFuel(fuel.id)}
                className={cn(
                  'px-4 py-2.5 rounded-full text-sm font-medium transition-colors',
                  selectedFuel === fuel.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {fuel.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Input */}
        <div className="mb-8">
          <label className="text-sm font-medium text-slate-500 mb-3 block">Цена за литр</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-full text-center text-5xl font-bold text-slate-900 bg-slate-50 rounded-2xl py-6 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-3xl font-medium text-slate-400">
              ֏
            </span>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        {submitState === 'sent' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Спасибо! Цена отправлена на проверку. После подтверждения она появится у всех.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            disabled={submitDisabled}
          >
            {submitState === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Отправляем…
              </>
            ) : (
              'Подтвердить'
            )}
          </Button>
        )}

        {/* Karma Hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>+10 кармы за подтверждённую цену</span>
        </div>
      </div>

      <BottomNav active="add" onNavigate={onNavigate} />
    </div>
  );
}
