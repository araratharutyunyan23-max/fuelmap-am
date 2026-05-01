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
  { id: 'cng', label: 'CNG' },
];

// Stations live in Supabase. Use `useStations()` from './stations-store' instead.

export const reviews = [
  {
    id: '1',
    avatar: 'А',
    name: 'Артур М.',
    rating: 5,
    text: 'Отличная заправка, всегда качественное топливо и быстрое обслуживание.',
  },
  {
    id: '2',
    avatar: 'Л',
    name: 'Левон К.',
    rating: 4,
    text: 'Хорошие цены, но иногда очередь в часы пик.',
  },
  {
    id: '3',
    avatar: 'М',
    name: 'Марина С.',
    rating: 5,
    text: 'Всегда заправляюсь здесь, рекомендую!',
  },
];

export const userProfile = {
  name: 'Арарат А.',
  level: 'Гуру цен',
  karma: 1450,
  pricesSubmitted: 127,
  saved: 2840,
  visitedStations: 23,
  recentFills: [
    { date: '28 апр', station: 'Flash #14', brand: 'Flash', brandColor: '#dc2626', fuel: 'АИ-95', amount: 25000, liters: 48.5 },
    { date: '24 апр', station: 'Shell', brand: 'Shell', brandColor: '#fbbf24', fuel: 'АИ-95', amount: 18500, liters: 35.8 },
    { date: '19 апр', station: 'Gazprom', brand: 'Gazprom', brandColor: '#1e40af', fuel: 'АИ-92', amount: 22000, liters: 46.1 },
  ],
  savedStations: [
    { id: '1', name: 'Flash #14', brand: 'Flash', brandColor: '#dc2626' },
    { id: '2', name: 'Shell', brand: 'Shell', brandColor: '#fbbf24' },
    { id: '5', name: 'City Petrol', brand: 'City Petrol', brandColor: '#16a34a' },
    { id: '7', name: 'Max Oil', brand: 'Max Oil', brandColor: '#0d9488' },
  ],
  achievements: [
    { id: '1', name: 'Первый отзыв', icon: '💬', unlocked: true },
    { id: '2', name: '10 цен', icon: '📊', unlocked: true },
    { id: '3', name: '50 цен', icon: '🏆', unlocked: true },
    { id: '4', name: '100 цен', icon: '⭐', unlocked: true },
    { id: '5', name: 'Эксперт', icon: '🎯', unlocked: false },
    { id: '6', name: 'Легенда', icon: '👑', unlocked: false },
  ],
};

export const priceHistory = [
  { date: '1 апр', price: 530 },
  { date: '5 апр', price: 528 },
  { date: '10 апр', price: 525 },
  { date: '15 апр', price: 522 },
  { date: '20 апр', price: 518 },
  { date: '25 апр', price: 515 },
  { date: '30 апр', price: 515 },
];
