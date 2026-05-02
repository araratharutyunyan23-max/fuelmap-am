'use client';

import { useState } from 'react';
import { ArrowLeft, Share2, Navigation, MessageSquare, ChevronRight, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { ReviewsBlock } from '@/components/reviews-block';
import { type Station } from '@/lib/data';
import { useT } from '@/lib/locale-store';
import type { TranslationKey } from '@/lib/i18n';

interface StationDetailScreenProps {
  station: Station;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

function buildRouteUrls(lat: number, lng: number) {
  return [
    {
      key: 'yandex' as const,
      url: `https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto&z=14`,
      logo: '🟡',
    },
    {
      key: 'google' as const,
      url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      logo: '🟢',
    },
    {
      key: 'apple' as const,
      url: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      logo: '🔵',
    },
  ];
}

export function StationDetailScreen({ station, onBack, onNavigate }: StationDetailScreenProps) {
  const t = useT();
  const [showRouteSheet, setShowRouteSheet] = useState(false);
  const routeUrls = buildRouteUrls(station.lat, station.lng);
  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Hero */}
      <div
        className="relative h-48"
        style={{
          background: `linear-gradient(135deg, ${station.brandColor}99 0%, ${station.brandColor}44 100%)`,
        }}
      >
        <div className="absolute inset-0 backdrop-blur-sm" />
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
          <button
            onClick={onBack}
            className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-10">
        {/* Station Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <h1 className="text-xl font-bold text-slate-900 mb-1">{station.name}</h1>
          <p className="text-slate-500">{station.address} · {station.distance} {t('common.km')}</p>
          {station.rating > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-slate-900">{station.rating.toFixed(1)}</span>
              <span className="text-sm text-slate-400">· {station.reviews}</span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl h-11"
              onClick={() => setShowRouteSheet(true)}
            >
              <Navigation className="w-4 h-4" />
              {t('detail.route')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl h-11"
              onClick={() => onNavigate('submit')}
            >
              <MessageSquare className="w-4 h-4" />
              {t('detail.reportPrice')}
            </Button>
          </div>
        </div>

        {/* Prices */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">{t('detail.prices.title')}</h2>
          {station.prices.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">{t('detail.prices.empty.title')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('detail.prices.empty.hint')}</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {station.prices.map((price) => (
              <div
                key={price.type}
                className="bg-slate-50 rounded-xl p-3"
              >
                <p className="text-sm text-slate-500 mb-1">{t(`fuel.${price.type}` as TranslationKey)}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-600">{price.price}</span>
                  <span className="text-sm text-slate-500">֏</span>
                </div>
                <span className="text-xs text-slate-400 block mt-1">{price.updatedAgo}</span>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Reviews */}
        <ReviewsBlock stationId={station.id} onLoginRequired={() => onNavigate('login')} />
      </div>

      <BottomNav active="map" onNavigate={onNavigate} />

      {/* Route picker bottom sheet */}
      {showRouteSheet && (
        <div
          className="fixed inset-0 z-[2000] bg-black/40 flex items-end sm:items-center justify-center"
          onClick={() => setShowRouteSheet(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{t('detail.routePicker.title')}</h3>
              <button
                onClick={() => setShowRouteSheet(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {routeUrls.map((opt) => {
                const name = t(`detail.routePicker.${opt.key}` as any);
                const sub =
                  opt.key === 'yandex'
                    ? t('detail.routePicker.yandexSub')
                    : opt.key === 'apple'
                    ? t('detail.routePicker.appleSub')
                    : '';
                return (
                  <a
                    key={opt.key}
                    href={opt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowRouteSheet(false)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-2xl">{opt.logo}</span>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-900">{name}</p>
                      {sub && <p className="text-xs text-slate-500">{sub}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </a>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 text-center mt-4">
              {t('detail.routePicker.hint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
