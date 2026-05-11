'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Share2, Navigation, MessageSquare, TrendingDown, TrendingUp, ChevronRight, X, Star, Pencil, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { ReviewsBlock } from '@/components/reviews-block';
import { type FuelType, type Station } from '@/lib/data';
import { useT } from '@/lib/locale-store';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/lib/favorites-store';
import { useAuth } from '@/lib/auth-store';
import { useStations } from '@/lib/stations-store';
import { supabase } from '@/lib/supabase';

const ALL_FUELS: { id: FuelType; label: string }[] = [
  { id: '92', label: '92' },
  { id: '95', label: '95' },
  { id: '98', label: '98' },
  { id: 'diesel', label: 'Дизель' },
  { id: 'lpg', label: 'LPG' },
];

function defaultLabel(fuel: FuelType): string {
  if (fuel === 'lpg') return 'LPG';
  if (fuel === 'diesel') return 'Дизель';
  return fuel;
}

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
  const { user } = useAuth();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const { stations: liveStations } = useStations();
  const [showRouteSheet, setShowRouteSheet] = useState(false);
  // Reflect Realtime price updates (the prop is a stale snapshot from when the
  // user tapped a station in the map/list).
  const liveStation = liveStations.find((s) => s.id === station.id) ?? station;
  const routeUrls = buildRouteUrls(liveStation.lat, liveStation.lng);
  const fav = isFavorite(liveStation.id);

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    supabase.rpc('is_admin').then(({ data }) => {
      if (!cancelled) setIsAdmin(Boolean(data));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [editing, setEditing] = useState<Partial<Record<FuelType, string>>>({});
  const [savingFuel, setSavingFuel] = useState<FuelType | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const startEdit = (fuel: FuelType, currentPrice: number | null) => {
    setAdminError(null);
    setEditing((prev) => ({ ...prev, [fuel]: currentPrice != null ? String(currentPrice) : '' }));
  };

  const cancelEdit = (fuel: FuelType) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[fuel];
      return next;
    });
  };

  const savePrice = async (fuel: FuelType) => {
    const raw = (editing[fuel] ?? '').trim();
    const price = parseInt(raw, 10);
    if (!Number.isFinite(price) || price <= 0) {
      setAdminError('Цена должна быть положительным числом');
      return;
    }
    setSavingFuel(fuel);
    setAdminError(null);
    const { error } = await supabase.from('station_prices').upsert(
      {
        station_id: liveStation.id,
        fuel_type: fuel,
        label: defaultLabel(fuel),
        price,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'station_id,fuel_type' }
    );
    setSavingFuel(null);
    if (error) {
      setAdminError(error.message);
      return;
    }
    cancelEdit(fuel);
  };

  const handleStarClick = () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    toggleFavorite(liveStation.id);
  };

  const missingFuels = isAdmin
    ? ALL_FUELS.filter((f) => !liveStation.prices.some((p) => p.type === f.id))
    : [];

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Hero */}
      <div
        className="relative h-48"
        style={{
          background: `linear-gradient(135deg, ${liveStation.brandColor}99 0%, ${liveStation.brandColor}44 100%)`,
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleStarClick}
              aria-label={fav ? t('favorites.remove') : t('favorites.add')}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors"
            >
              <Star
                className={cn(
                  'w-5 h-5 transition-colors',
                  fav ? 'fill-amber-400 text-amber-400' : 'text-white'
                )}
              />
            </button>
            <button className="p-2 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-8 relative z-10">
        {/* Station Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-4">
          <h1 className="text-xl font-bold text-slate-900 mb-1">{liveStation.name}</h1>
          <p className="text-slate-500">{liveStation.address} · {liveStation.distance} {t('common.km')}</p>
          {liveStation.rating > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium text-slate-900">{liveStation.rating.toFixed(1)}</span>
              <span className="text-sm text-slate-400">· {liveStation.reviews}</span>
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
          {adminError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {adminError}
            </div>
          )}
          {liveStation.prices.length === 0 && missingFuels.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-6 text-center">
              <p className="text-sm text-slate-500">{t('detail.prices.empty.title')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('detail.prices.empty.hint')}</p>
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {liveStation.prices.map((price) => {
              const editValue = editing[price.type];
              const isEditing = editValue !== undefined;
              const isSaving = savingFuel === price.type;
              return (
                <div key={price.type} className="bg-slate-50 rounded-xl p-3 relative">
                  <p className="text-sm text-slate-500 mb-1">{t(`fuel.${price.type}` as TranslationKey)}</p>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={editValue}
                        onChange={(e) =>
                          setEditing((cur) => ({ ...cur, [price.type]: e.target.value.replace(/\D/g, '') }))
                        }
                        className="w-16 h-8 px-2 text-lg font-bold text-emerald-600 bg-white rounded-md border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => savePrice(price.type)}
                        disabled={isSaving}
                        aria-label="Сохранить"
                        className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => cancelEdit(price.type)}
                        disabled={isSaving}
                        aria-label="Отмена"
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded-md disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{price.price}</span>
                        <span className="text-sm text-slate-500">֏</span>
                        {isAdmin && (
                          <button
                            onClick={() => startEdit(price.type, price.price)}
                            aria-label="Редактировать цену"
                            className="ml-auto p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
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
                    </>
                  )}
                </div>
              );
            })}
            {missingFuels.map((f) => {
              const editValue = editing[f.id];
              const isEditing = editValue !== undefined;
              const isSaving = savingFuel === f.id;
              return (
                <div key={f.id} className="bg-slate-50/60 border border-dashed border-slate-200 rounded-xl p-3">
                  <p className="text-sm text-slate-500 mb-1">{t(`fuel.${f.id}` as TranslationKey)}</p>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={editValue}
                        onChange={(e) =>
                          setEditing((cur) => ({ ...cur, [f.id]: e.target.value.replace(/\D/g, '') }))
                        }
                        placeholder="—"
                        className="w-16 h-8 px-2 text-lg font-bold text-emerald-600 bg-white rounded-md border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => savePrice(f.id)}
                        disabled={isSaving}
                        aria-label="Сохранить"
                        className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => cancelEdit(f.id)}
                        disabled={isSaving}
                        aria-label="Отмена"
                        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-200 rounded-md disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(f.id, null)}
                      className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Добавить цену
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Reviews */}
        <ReviewsBlock stationId={liveStation.id} onLoginRequired={() => onNavigate('login')} />
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
