'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { BottomNav } from '@/components/bottom-nav';
import { FUEL_TYPES, type Station } from '@/lib/data';
import { useStations } from '@/lib/stations-store';
import { cn } from '@/lib/utils';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

interface CheapestScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  onStationSelect: (station: Station) => void;
}

function createCustomIcon(color: string, rank: number) {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 32px; height: 32px; background-color: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${rank}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function CheapestScreen({ onBack, onNavigate, onStationSelect }: CheapestScreenProps) {
  const { stations } = useStations();
  const [selectedFuel, setSelectedFuel] = useState('95');
  const [priceAlert, setPriceAlert] = useState('510');
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get top 5 cheapest stations for selected fuel
  const cheapestStations = [...stations]
    .map((s) => ({
      ...s,
      price: s.prices.find((p) => p.type === selectedFuel)?.price ?? 999,
    }))
    .filter((s) => s.price < 999)
    .sort((a, b) => a.price - b.price)
    .slice(0, 5);

  // Calculate average price
  const allPrices = stations
    .map((s) => s.prices.find((p) => p.type === selectedFuel)?.price)
    .filter(Boolean) as number[];
  const avgPrice = allPrices.length ? Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length) : 0;

  const fuelTabs = FUEL_TYPES.filter((f) => ['92', '95', '98', 'diesel', 'lpg'].includes(f.id));

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Сегодня дешевле всего</h1>
            <p className="text-sm text-slate-500">Обновлено 14:32</p>
          </div>
        </div>

        {/* Fuel Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fuelTabs.map((fuel) => (
            <button
              key={fuel.id}
              onClick={() => setSelectedFuel(fuel.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedFuel === fuel.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {fuel.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 5 List */}
      <div className="px-4 py-4 space-y-3">
        {cheapestStations.map((station, index) => {
          const rank = index + 1;
          const priceDiff = station.price - avgPrice;

          return (
            <button
              key={station.id}
              onClick={() => onStationSelect(station)}
              className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center gap-4">
                {/* Rank Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0',
                    rank === 1 && 'bg-emerald-600',
                    rank === 2 && 'bg-emerald-500',
                    rank === 3 && 'bg-emerald-400',
                    rank > 3 && 'bg-slate-400'
                  )}
                >
                  {rank}
                </div>

                {/* Brand Color Stripe */}
                <div
                  className="w-1 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: station.brandColor }}
                />

                {/* Station Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{station.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{station.address}</p>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-emerald-600">{station.price} ֏</p>
                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                    {priceDiff} ֏ от средней
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mini Map */}
      <div className="px-4 mb-4">
        <div className="h-40 rounded-xl overflow-hidden border border-slate-200">
          {mounted && (
            <MapContainer
              center={[40.1872, 44.5152]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              dragging={false}
              scrollWheelZoom={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {cheapestStations.map((station, index) => {
                const icon = createCustomIcon(station.brandColor, index + 1);
                return (
                  <Marker
                    key={station.id}
                    position={[station.lat, station.lng]}
                    icon={icon}
                  />
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>

      {/* Price Alert CTA */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Bell className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-slate-900 mb-1">
                Уведомить когда цена упадёт ниже…
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={priceAlert}
                    onChange={(e) => setPriceAlert(e.target.value)}
                    className="w-full pr-8 pl-3 py-2 bg-slate-100 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">֏</span>
                </div>
                <Switch
                  checked={alertEnabled}
                  onCheckedChange={setAlertEnabled}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="list" onNavigate={onNavigate} />

      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
    </div>
  );
}
