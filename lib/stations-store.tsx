'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Station } from './data';
import { useUserLocation } from './user-location';
import { useLocale } from './locale-store';
import { translate, type Locale } from './i18n';

const YEREVAN_CENTER = { lat: 40.1872, lng: 44.5152 };

function relativeTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return translate(locale, 'time.longAgo');
  const ageMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ageMs / 60000);
  if (minutes < 60) {
    return minutes <= 1
      ? translate(locale, 'time.justNow')
      : translate(locale, 'time.minutes', { n: minutes });
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) return translate(locale, 'time.hours', { n: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return translate(locale, 'time.days', { n: days });
  return translate(locale, 'time.longAgo');
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

interface StationsContextValue {
  stations: Station[];
  loading: boolean;
  error: string | null;
}

const StationsContext = createContext<StationsContextValue>({
  stations: [],
  loading: true,
  error: null,
});

// Raw row carries an extra `addressHy` field that the public Station type
// doesn't expose; the locale-aware memo collapses it into `address`.
type RawStation = Station & { addressHy: string | null };

export function StationsProvider({ children }: { children: ReactNode }) {
  const [rawStations, setRawStations] = useState<RawStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { location } = useUserLocation();
  const { locale } = useLocale();

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('stations')
      .select(
        'id, name, brand, brand_color, address, address_hy, lat, lng, rating, reviews_count, hours, station_prices(fuel_type, label, price, trend, updated_at)'
      )
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        const mapped: RawStation[] = (data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          brand: s.brand,
          brandColor: s.brand_color,
          address: s.address ?? '',
          addressHy: s.address_hy ?? null,
          lat: s.lat,
          lng: s.lng,
          // Distance is recomputed against the user's position below.
          // This default is only used if the user denies/never grants geolocation.
          distance: 0,
          rating: Number(s.rating ?? 0),
          reviews: s.reviews_count ?? 0,
          prices: (s.station_prices ?? []).map((p: any) => ({
            type: p.fuel_type,
            label: p.label,
            price: p.price,
            trend: p.trend ?? 0,
            // Recomputed below in the locale-aware memo.
            updatedAgo: '',
            updatedAt: p.updated_at,
          })),
          hours: s.hours ?? [],
        }));
        setRawStations(mapped);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stations = useMemo<Station[]>(() => {
    const origin = location ?? YEREVAN_CENTER;
    return rawStations.map((s) => {
      const { addressHy, ...rest } = s;
      return {
        ...rest,
        // Pick the locale-specific address; fall back to RU-default if missing.
        address: locale === 'hy' && addressHy ? addressHy : s.address,
        distance: haversineKm({ lat: s.lat, lng: s.lng }, origin),
        prices: s.prices.map((p: any) => ({
          ...p,
          updatedAgo: relativeTime(p.updatedAt, locale),
        })),
      };
    });
  }, [rawStations, location, locale]);

  return <StationsContext.Provider value={{ stations, loading, error }}>{children}</StationsContext.Provider>;
}

export function useStations() {
  return useContext(StationsContext);
}
