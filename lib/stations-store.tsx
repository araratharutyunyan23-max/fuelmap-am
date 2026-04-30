'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Station } from './data';

const YEREVAN_CENTER = { lat: 40.1872, lng: 44.5152 };

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
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          distance: haversineKm({ lat: s.lat, lng: s.lng }, YEREVAN_CENTER),
          rating: Number(s.rating ?? 4.0),
          reviews: s.reviews_count ?? 0,
          prices: (s.station_prices ?? []).map((p: any) => ({
            type: p.fuel_type,
            label: p.label,
            price: p.price,
            trend: p.trend ?? 0,
            updatedAgo: 'недавно',
          })),
          hours: s.hours ?? [],
        }));
        setStations(mapped);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <StationsContext.Provider value={{ stations, loading, error }}>{children}</StationsContext.Provider>;
}

export function useStations() {
  return useContext(StationsContext);
}
