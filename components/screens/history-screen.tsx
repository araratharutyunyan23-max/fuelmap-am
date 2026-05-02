'use client';

import { Calendar, TrendingDown, TrendingUp, Fuel } from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { userProfile } from '@/lib/data';
import { useT } from '@/lib/locale-store';

interface HistoryScreenProps {
  onNavigate: (screen: string) => void;
}

export function HistoryScreen({ onNavigate }: HistoryScreenProps) {
  const t = useT();
  // Extended history data
  const historyData = [
    ...userProfile.recentFills,
    { date: '15 апр', station: 'City Petrol', brand: 'City Petrol', brandColor: '#16a34a', fuel: 'АИ-95', amount: 20000, liters: 38.1 },
    { date: '10 апр', station: 'Max Oil', brand: 'Max Oil', brandColor: '#0d9488', fuel: 'АИ-92', amount: 19500, liters: 40.6 },
    { date: '5 апр', station: 'Flash #14', brand: 'Flash', brandColor: '#dc2626', fuel: 'АИ-95', amount: 26500, liters: 50.0 },
    { date: '1 апр', station: 'Sas Oil', brand: 'Sas Oil', brandColor: '#f97316', fuel: 'Дизель', amount: 28000, liters: 52.8 },
    { date: '28 мар', station: 'Shell', brand: 'Shell', brandColor: '#fbbf24', fuel: 'АИ-98', amount: 32000, liters: 54.2 },
  ];

  // Calculate totals
  const totalSpent = historyData.reduce((sum, fill) => sum + fill.amount, 0);
  const totalLiters = historyData.reduce((sum, fill) => sum + fill.liters, 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-slate-900">{t('history.title')}</h1>
      </div>

      {/* Summary Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm text-slate-500">{t('history.totalSpent')}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalSpent.toLocaleString()} ֏</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Fuel className="w-4 h-4 text-orange-600" />
              </div>
              <span className="text-sm text-slate-500">{t('history.totalLiters')}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalLiters.toFixed(1)} {t('history.litersSuffix')}</p>
          </div>
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Апрель 2026</span>
        </div>

        {/* History List */}
        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
          {historyData.map((fill, index) => (
            <div key={index} className="flex items-center gap-3 p-4">
              <div
                className="w-1 h-12 rounded-full flex-shrink-0"
                style={{ backgroundColor: fill.brandColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-slate-900 truncate">{fill.station}</p>
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full text-white flex-shrink-0"
                    style={{ backgroundColor: fill.brandColor }}
                  >
                    {fill.fuel}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{fill.date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-slate-900">{fill.amount.toLocaleString()} ֏</p>
                <p className="text-sm text-slate-500">{fill.liters} {t('history.litersSuffix')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="history" onNavigate={onNavigate} />
    </div>
  );
}
