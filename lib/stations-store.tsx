'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Station } from './data';
import { useUserLocation } from './user-location';

const YEREVAN_CENTER = { lat: 40.1872, lng: 44.5152 };

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'давно';
  const ageMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(ageMs / 60000);
  if (minutes < 60) return minutes <= 1 ? 'только что' : `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} дн назад`;
  return 'давно';
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

export function StationsProvider({ children }: { children: ReactNode }) {
  const [rawStations, setRawStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { location } = useUserLocation();

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('stations')
      .select(
        'id, name, brand, brand_color, address, lat, lng, rating, reviews_count, hours, station_prices(fuel_type, label, price, trend, updated_at)'
      )
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        const mapped: Station[] = (data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          brand: s.brand,
          brandColor: s.brand_color,
          address: s.address ?? '',
          lat: s.lat,
          lng: s.lng,
          // Distance is recomputed against the user's position below.
          // This default is only used if the user denies/never grants geolocation.
          distance: 0,
          rating: Number(s.rating ?? 4.0),
          reviews: s.reviews_count ?? 0,
          prices: (s.station_prices ?? []).map((p: any) => ({
            type: p.fuel_type,
            label: p.label,
            price: p.price,
            trend: p.trend ?? 0,
            updatedAgo: relativeTime(p.updated_at),
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

  const stations = useMemo(() => {
    const origin = location ?? YEREVAN_CENTER;
    return rawStations.map((s) => ({
      ...s,
      distance: haversineKm({ lat: s.lat, lng: s.lng }, origin),
    }));
  }, [rawStations, location]);

  return <StationsContext.Provider value={{ stations, loading, error }}>{children}</StationsContext.Provider>;
}

export function useStations() {
  return useContext(StationsContext);
}
