'use client';

import { useState } from 'react';
import { ArrowLeft, Camera, Pencil, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { stations, FUEL_TYPES } from '@/lib/data';
import { cn } from '@/lib/utils';

interface SubmitPriceScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export function SubmitPriceScreen({ onBack, onNavigate }: SubmitPriceScreenProps) {
  const [selectedFuel, setSelectedFuel] = useState('95');
  const [price, setPrice] = useState('');
  const [selectedStation] = useState(stations[0]);

  const fuelChips = FUEL_TYPES.filter((f) => ['92', '95', '98', 'diesel', 'lpg', 'cng'].includes(f.id));

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
        {/* Photo Upload Zone */}
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

        {/* Auto-detected Station */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-2 block">
            Автоопределённая АЗС
          </label>
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
            <div
              className="w-1 h-10 rounded-full"
              style={{ backgroundColor: selectedStation.brandColor }}
            />
            <div className="flex-1">
              <p className="font-medium text-slate-900">{selectedStation.name}</p>
              <p className="text-sm text-slate-500">{selectedStation.address}</p>
            </div>
            <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <Pencil className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Fuel Type Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-3 block">
            Тип топлива
          </label>
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
          <label className="text-sm font-medium text-slate-500 mb-3 block">
            Цена за литр
          </label>
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

        {/* Submit Button */}
        <Button
          className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
          disabled={!price}
        >
          Подтвердить
        </Button>

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
