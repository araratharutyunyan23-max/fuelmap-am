'use client';

import { useState } from 'react';
import { ArrowLeft, Share2, Navigation, MessageSquare, Star, TrendingDown, TrendingUp, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { type Station, reviews, priceHistory } from '@/lib/data';
import { cn } from '@/lib/utils';
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface StationDetailScreenProps {
  station: Station;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

function buildRouteUrls(lat: number, lng: number) {
  return [
    {
      name: 'Yandex Карты',
      sub: 'или Yandex Навигатор',
      url: `https://yandex.com/maps/?rtext=~${lat},${lng}&rtt=auto&z=14`,
      logo: '🟡',
    },
    {
      name: 'Google Maps',
      sub: '',
      url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      logo: '🟢',
    },
    {
      name: 'Apple Карты',
      sub: 'iPhone / iPad',
      url: `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      logo: '🔵',
    },
  ];
}

export function StationDetailScreen({ station, onBack, onNavigate }: StationDetailScreenProps) {
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
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium text-slate-900">{station.rating}</span>
            </div>
            <span className="text-slate-400">({station.reviews} отзывов)</span>
          </div>
          <p className="text-slate-500">{station.address} · {station.distance} км</p>

          {/* Quick Actions */}
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl h-11"
              onClick={() => setShowRouteSheet(true)}
            >
              <Navigation className="w-4 h-4" />
              Маршрут
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 rounded-xl h-11"
              onClick={() => onNavigate('submit')}
            >
              <MessageSquare className="w-4 h-4" />
              Сообщить цену
            </Button>
          </div>
        </div>

        {/* Prices */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Цены на топливо</h2>
          {station.prices.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">Цены ещё не указаны</p>
              <p className="text-xs text-slate-400 mt-1">
                Заправлялись здесь? Сообщите цену через кнопку выше.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {station.prices.map((price) => (
              <div
                key={price.type}
                className="bg-slate-50 rounded-xl p-3"
              >
                <p className="text-sm text-slate-500 mb-1">{price.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-emerald-600">{price.price}</span>
                  <span className="text-sm text-slate-500">֏</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-slate-400">{price.updatedAgo}</span>
                  {price.trend !== 0 && (
                    <div
                      className={cn(
                        'flex items-center gap-0.5 text-xs font-medium',
                        price.trend < 0 ? 'text-emerald-600' : 'text-red-500'
                      )}
                    >
                      {price.trend < 0 ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                      {price.trend > 0 ? '+' : ''}{price.trend} ֏
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Price History Chart */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">История цен</h2>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#059669"
                    strokeWidth={2}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>1 апр</span>
              <span>30 апр</span>
            </div>
          </div>
        </div>

        {/* Hours */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Часы работы</h2>
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            {station.hours.map((hour) => (
              <div
                key={hour.day}
                className={cn(
                  'flex justify-between text-sm',
                  hour.isToday && 'font-semibold text-emerald-600'
                )}
              >
                <span>{hour.day}</span>
                <span>{hour.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Отзывы</h2>
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-semibold">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{review.name}</p>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'w-3 h-3',
                            i < review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600">{review.text}</p>
              </div>
            ))}
          </div>
          <button className="flex items-center gap-1 mt-3 text-emerald-600 font-medium text-sm hover:text-emerald-700">
            Все отзывы
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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
              <h3 className="text-lg font-semibold text-slate-900">Открыть в…</h3>
              <button
                onClick={() => setShowRouteSheet(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {routeUrls.map((opt) => (
                <a
                  key={opt.name}
                  href={opt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShowRouteSheet(false)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <span className="text-2xl">{opt.logo}</span>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-900">{opt.name}</p>
                    {opt.sub && <p className="text-xs text-slate-500">{opt.sub}</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center mt-4">
              Откроется приложение, если установлено, иначе веб-версия.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
