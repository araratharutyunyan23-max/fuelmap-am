'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal, Badge } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { FuelChips } from '@/components/fuel-chips';
import { BottomNav } from '@/components/bottom-nav';
import { type Station } from '@/lib/data';
import { useStations } from '@/lib/stations-store';
import { cn } from '@/lib/utils';

interface ListScreenProps {
  onNavigate: (screen: string) => void;
  onStationSelect: (station: Station) => void;
}

export function ListScreen({ onNavigate, onStationSelect }: ListScreenProps) {
  const { stations } = useStations();
  const [selectedFuel, setSelectedFuel] = useState('95');
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('price');

  const sortedStations = [...stations].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    const priceA = a.prices.find(p => p.type === selectedFuel)?.price ?? 999;
    const priceB = b.prices.find(p => p.type === selectedFuel)?.price ?? 999;
    return priceA - priceB;
  });

  // Calculate average price
  const prices = sortedStations.map(s => s.prices.find(p => p.type === selectedFuel)?.price ?? 0);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ереван…"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button className="p-2.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Sort Toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setSortBy('distance')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                sortBy === 'distance'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              )}
            >
              Ближе
            </button>
            <button
              onClick={() => setSortBy('price')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                sortBy === 'price'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              )}
            >
              Дешевле
            </button>
          </div>
          <LanguageSwitcher selected="ru" className="hidden sm:flex" />
        </div>

        <FuelChips selected={selectedFuel} onChange={setSelectedFuel} />
      </div>

      {/* Station List */}
      <div className="px-4 py-4 space-y-3">
        {sortedStations.map((station, index) => {
          const price = station.prices.find(p => p.type === selectedFuel);
          const priceDiff = price ? price.price - avgPrice : 0;
          const isCheapest = index === 0 && sortBy === 'price';

          return (
            <button
              key={station.id}
              onClick={() => onStationSelect(station)}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start gap-3">
                {/* Brand Color Stripe */}
                <div
                  className="w-1 h-16 rounded-full flex-shrink-0"
                  style={{ backgroundColor: station.brandColor }}
                />

                {/* Station Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{station.name}</h3>
                    <span
                      className="px-2 py-0.5 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: station.brandColor }}
                    >
                      {station.brand}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {station.address} · {station.distance} км
                  </p>
                  {isCheapest && (
                    <span className="inline-block mt-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                      Самый дешёвый
                    </span>
                  )}
                </div>

                {/* Price */}
                {price && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-emerald-600">{price.price} ֏</p>
                    <p
                      className={cn(
                        'text-xs font-medium',
                        priceDiff < 0 ? 'text-emerald-600' : priceDiff > 0 ? 'text-red-500' : 'text-slate-400'
                      )}
                    >
                      {priceDiff < 0 ? '' : priceDiff > 0 ? '+' : ''}{priceDiff} ֏ от средней
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <BottomNav active="list" onNavigate={onNavigate} />
    </div>
  );
}
