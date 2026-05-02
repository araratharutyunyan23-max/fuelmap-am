export type FuelType = '92' | '95' | '98' | 'diesel' | 'lpg' | 'cng';

export interface Station {
  id: string;
  name: string;
  brand: string;
  brandColor: string;
  address: string;
  lat: number;
  lng: number;
  distance: number;
  rating: number;
  reviews: number;
  prices: {
    type: FuelType;
    label: string;
    price: number;
    trend: number;
    updatedAgo: string;
  }[];
  hours: { day: string; time: string; isToday?: boolean }[];
}

export const FUEL_TYPES = [
  { id: '92', label: '92' },
  { id: '95', label: '95' },
  { id: '98', label: '98' },
  { id: 'diesel', label: 'Дизель' },
  { id: 'lpg', label: 'LPG' },
];

// Stations live in Supabase. Use `useStations()` from './stations-store' instead.
