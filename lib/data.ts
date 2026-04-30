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

export const BRAND_COLORS: Record<string, string> = {
  'Flash': '#dc2626',
  'Shell': '#fbbf24',
  'Gazprom': '#1e40af',
  'Sas Oil': '#f97316',
  'City Petrol': '#16a34a',
  'Agat': '#9333ea',
  'Max Oil': '#0d9488',
  'Lukoil': '#991b1b',
};

export const FUEL_TYPES = [
  { id: '92', label: '92' },
  { id: '95', label: '95' },
  { id: '98', label: '98' },
  { id: 'diesel', label: 'Дизель' },
  { id: 'lpg', label: 'LPG' },
  { id: 'cng', label: 'CNG' },
];

export const stations: Station[] = [
  {
    id: '1',
    name: 'Flash #14',
    brand: 'Flash',
    brandColor: '#dc2626',
    address: 'ул. Комитаса 42',
    lat: 40.2024,
    lng: 44.4912,
    distance: 1.2,
    rating: 4.6,
    reviews: 234,
    prices: [
      { type: '92', label: 'АИ-92', price: 475, trend: -5, updatedAgo: '12 мин назад' },
      { type: '95', label: 'АИ-95', price: 515, trend: -12, updatedAgo: '12 мин назад' },
      { type: '98', label: 'АИ-98', price: 575, trend: 0, updatedAgo: '2 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 535, trend: -8, updatedAgo: '45 мин назад' },
      { type: 'lpg', label: 'LPG', price: 285, trend: 3, updatedAgo: '1 ч назад' },
    ],
    hours: [
      { day: 'Пн', time: '06:00 – 23:00' },
      { day: 'Вт', time: '06:00 – 23:00' },
      { day: 'Ср', time: '06:00 – 23:00', isToday: true },
      { day: 'Чт', time: '06:00 – 23:00' },
      { day: 'Пт', time: '06:00 – 23:00' },
      { day: 'Сб', time: '07:00 – 22:00' },
      { day: 'Вс', time: '08:00 – 21:00' },
    ],
  },
  {
    id: '2',
    name: 'Shell',
    brand: 'Shell',
    brandColor: '#fbbf24',
    address: 'пр. Маштоца 18',
    lat: 40.183,
    lng: 44.5102,
    distance: 2.1,
    rating: 4.8,
    reviews: 412,
    prices: [
      { type: '92', label: 'АИ-92', price: 485, trend: 0, updatedAgo: '30 мин назад' },
      { type: '95', label: 'АИ-95', price: 530, trend: -5, updatedAgo: '30 мин назад' },
      { type: '98', label: 'АИ-98', price: 590, trend: 10, updatedAgo: '1 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 550, trend: 5, updatedAgo: '30 мин назад' },
      { type: 'lpg', label: 'LPG', price: 295, trend: 0, updatedAgo: '2 ч назад' },
    ],
    hours: [
      { day: 'Пн', time: '00:00 – 24:00' },
      { day: 'Вт', time: '00:00 – 24:00' },
      { day: 'Ср', time: '00:00 – 24:00', isToday: true },
      { day: 'Чт', time: '00:00 – 24:00' },
      { day: 'Пт', time: '00:00 – 24:00' },
      { day: 'Сб', time: '00:00 – 24:00' },
      { day: 'Вс', time: '00:00 – 24:00' },
    ],
  },
  {
    id: '3',
    name: 'Gazprom',
    brand: 'Gazprom',
    brandColor: '#1e40af',
    address: 'ул. Тиграна Меца 75',
    lat: 40.1745,
    lng: 44.5234,
    distance: 2.8,
    rating: 4.4,
    reviews: 189,
    prices: [
      { type: '92', label: 'АИ-92', price: 478, trend: -3, updatedAgo: '1 ч назад' },
      { type: '95', label: 'АИ-95', price: 520, trend: -8, updatedAgo: '1 ч назад' },
      { type: '98', label: 'АИ-98', price: 580, trend: 0, updatedAgo: '3 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 540, trend: -5, updatedAgo: '1 ч назад' },
      { type: 'cng', label: 'CNG', price: 230, trend: -10, updatedAgo: '2 ч назад' },
    ],
    hours: [
      { day: 'Пн', time: '06:00 – 22:00' },
      { day: 'Вт', time: '06:00 – 22:00' },
      { day: 'Ср', time: '06:00 – 22:00', isToday: true },
      { day: 'Чт', time: '06:00 – 22:00' },
      { day: 'Пт', time: '06:00 – 22:00' },
      { day: 'Сб', time: '07:00 – 21:00' },
      { day: 'Вс', time: '08:00 – 20:00' },
    ],
  },
  {
    id: '4',
    name: 'Sas Oil',
    brand: 'Sas Oil',
    brandColor: '#f97316',
    address: 'ш. Эребуни 21',
    lat: 40.1567,
    lng: 44.5345,
    distance: 3.5,
    rating: 4.2,
    reviews: 156,
    prices: [
      { type: '92', label: 'АИ-92', price: 470, trend: -10, updatedAgo: '20 мин назад' },
      { type: '95', label: 'АИ-95', price: 510, trend: -15, updatedAgo: '20 мин назад' },
      { type: '98', label: 'АИ-98', price: 570, trend: -5, updatedAgo: '1 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 530, trend: -10, updatedAgo: '20 мин назад' },
      { type: 'lpg', label: 'LPG', price: 280, trend: -5, updatedAgo: '45 мин назад' },
    ],
    hours: [
      { day: 'Пн', time: '07:00 – 22:00' },
      { day: 'Вт', time: '07:00 – 22:00' },
      { day: 'Ср', time: '07:00 – 22:00', isToday: true },
      { day: 'Чт', time: '07:00 – 22:00' },
      { day: 'Пт', time: '07:00 – 22:00' },
      { day: 'Сб', time: '08:00 – 21:00' },
      { day: 'Вс', time: '08:00 – 20:00' },
    ],
  },
  {
    id: '5',
    name: 'City Petrol',
    brand: 'City Petrol',
    brandColor: '#16a34a',
    address: 'ул. Аршакуняц 89',
    lat: 40.1623,
    lng: 44.4889,
    distance: 1.8,
    rating: 4.5,
    reviews: 267,
    prices: [
      { type: '92', label: 'АИ-92', price: 480, trend: -2, updatedAgo: '35 мин назад' },
      { type: '95', label: 'АИ-95', price: 525, trend: -7, updatedAgo: '35 мин назад' },
      { type: '98', label: 'АИ-98', price: 585, trend: 5, updatedAgo: '2 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 545, trend: 0, updatedAgo: '35 мин назад' },
      { type: 'lpg', label: 'LPG', price: 290, trend: 2, updatedAgo: '1 ч назад' },
    ],
    hours: [
      { day: 'Пн', time: '06:00 – 23:00' },
      { day: 'Вт', time: '06:00 – 23:00' },
      { day: 'Ср', time: '06:00 – 23:00', isToday: true },
      { day: 'Чт', time: '06:00 – 23:00' },
      { day: 'Пт', time: '06:00 – 23:00' },
      { day: 'Сб', time: '07:00 – 22:00' },
      { day: 'Вс', time: '07:00 – 21:00' },
    ],
  },
  {
    id: '6',
    name: 'Agat',
    brand: 'Agat',
    brandColor: '#9333ea',
    address: 'ул. Арзуманяна 4',
    lat: 40.2089,
    lng: 44.5489,
    distance: 4.2,
    rating: 4.3,
    reviews: 98,
    prices: [
      { type: '92', label: 'АИ-92', price: 472, trend: -8, updatedAgo: '50 мин назад' },
      { type: '95', label: 'АИ-95', price: 512, trend: -13, updatedAgo: '50 мин назад' },
      { type: '98', label: 'АИ-98', price: 572, trend: -3, updatedAgo: '2 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 532, trend: -8, updatedAgo: '50 мин назад' },
      { type: 'cng', label: 'CNG', price: 225, trend: -15, updatedAgo: '1 ч назад' },
    ],
    hours: [
      { day: 'Пн', time: '06:00 – 22:00' },
      { day: 'Вт', time: '06:00 – 22:00' },
      { day: 'Ср', time: '06:00 – 22:00', isToday: true },
      { day: 'Чт', time: '06:00 – 22:00' },
      { day: 'Пт', time: '06:00 – 22:00' },
      { day: 'Сб', time: '07:00 – 21:00' },
      { day: 'Вс', time: '08:00 – 20:00' },
    ],
  },
  {
    id: '7',
    name: 'Max Oil',
    brand: 'Max Oil',
    brandColor: '#0d9488',
    address: 'ул. Чаренца 12',
    lat: 40.1912,
    lng: 44.5298,
    distance: 2.5,
    rating: 4.7,
    reviews: 312,
    prices: [
      { type: '92', label: 'АИ-92', price: 482, trend: -3, updatedAgo: '25 мин назад' },
      { type: '95', label: 'АИ-95', price: 522, trend: -10, updatedAgo: '25 мин назад' },
      { type: '98', label: 'АИ-98', price: 582, trend: 0, updatedAgo: '1 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 542, trend: -3, updatedAgo: '25 мин назад' },
      { type: 'lpg', label: 'LPG', price: 288, trend: -2, updatedAgo: '40 мин назад' },
    ],
    hours: [
      { day: 'Пн', time: '05:00 – 24:00' },
      { day: 'Вт', time: '05:00 – 24:00' },
      { day: 'Ср', time: '05:00 – 24:00', isToday: true },
      { day: 'Чт', time: '05:00 – 24:00' },
      { day: 'Пт', time: '05:00 – 24:00' },
      { day: 'Сб', time: '06:00 – 23:00' },
      { day: 'Вс', time: '06:00 – 22:00' },
    ],
  },
  {
    id: '8',
    name: 'Shell #2',
    brand: 'Shell',
    brandColor: '#fbbf24',
    address: 'ш. Севан 5',
    lat: 40.2156,
    lng: 44.5067,
    distance: 3.8,
    rating: 4.6,
    reviews: 287,
    prices: [
      { type: '92', label: 'АИ-92', price: 488, trend: 3, updatedAgo: '40 мин назад' },
      { type: '95', label: 'АИ-95', price: 535, trend: 0, updatedAgo: '40 мин назад' },
      { type: '98', label: 'АИ-98', price: 595, trend: 5, updatedAgo: '2 ч назад' },
      { type: 'diesel', label: 'Дизель', price: 555, trend: 5, updatedAgo: '40 мин назад' },
      { type: 'lpg', label: 'LPG', price: 298, trend: 3, updatedAgo: '1 ч назад' },
    ],
    hours: [
      { day: 'Пн', time: '00:00 – 24:00' },
      { day: 'Вт', time: '00:00 – 24:00' },
      { day: 'Ср', time: '00:00 – 24:00', isToday: true },
      { day: 'Чт', time: '00:00 – 24:00' },
      { day: 'Пт', time: '00:00 – 24:00' },
      { day: 'Сб', time: '00:00 – 24:00' },
      { day: 'Вс', time: '00:00 – 24:00' },
    ],
  },
];

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
