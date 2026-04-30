'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Search, SlidersHorizontal, ChevronUp, TrendingDown, Check } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { FuelChips } from '@/components/fuel-chips';
import { BottomNav } from '@/components/bottom-nav';
import { type Station } from '@/lib/data';
import { useStations } from '@/lib/stations-store';
import { cn } from '@/lib/utils';

function computeTopBrands(stations: Station[]) {
  const counts: Record<string, { count: number; color: string }> = {};
  for (const s of stations) {
    if (!counts[s.brand]) counts[s.brand] = { count: 0, color: s.brandColor };
    counts[s.brand].count++;
  }
  return Object.entries(counts)
    .filter(([b]) => b !== 'Other')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([name, { count, color }]) => ({ name, count, color }));
}

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
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface MapScreenProps {
  onNavigate: (screen: string) => void;
  onStationSelect: (station: Station) => void;
}

function createCustomIcon(color: string) {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 28px; height: 28px; background-color: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function MapScreen({ onNavigate, onStationSelect }: MapScreenProps) {
  const { stations, loading } = useStations();
  const [selectedFuel, setSelectedFuel] = useState('95');
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showBrandFilter, setShowBrandFilter] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const filterRef = useRef<HTMLDivElement>(null);
  const topBrands = useMemo(() => computeTopBrands(stations), [stations]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showBrandFilter) return;
    const onClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowBrandFilter(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showBrandFilter]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand); else next.add(brand);
      return next;
    });
  };

  const visibleStations = useMemo(
    () => selectedBrands.size === 0 ? stations : stations.filter(s => selectedBrands.has(s.brand)),
    [selectedBrands]
  );

  const sortedStations = useMemo(() => [...visibleStations].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    const priceA = a.prices.find(p => p.type === selectedFuel)?.price ?? 999;
    const priceB = b.prices.find(p => p.type === selectedFuel)?.price ?? 999;
    return priceA - priceB;
  }), [visibleStations, sortBy, selectedFuel]);

  const nearbyStations = sortedStations.slice(0, 3);

  return (
    <div className="relative h-screen flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Ереван…"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setShowBrandFilter(v => !v)}
              className={cn(
                'relative p-2.5 rounded-lg transition-colors',
                selectedBrands.size > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
              {selectedBrands.size > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {selectedBrands.size}
                </span>
              )}
            </button>
            {showBrandFilter && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-[2000] py-1 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-900">Топ-5 сетей</span>
                  {selectedBrands.size > 0 && (
                    <button
                      onClick={() => setSelectedBrands(new Set())}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Сбросить
                    </button>
                  )}
                </div>
                {topBrands.map(({ name, count, color }) => {
                  const checked = selectedBrands.has(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleBrand(name)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                        checked ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                      )}>
                        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </div>
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="flex-1 text-left text-sm font-medium text-slate-900">{name}</span>
                      <span className="text-xs text-slate-400">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <LanguageSwitcher selected="ru" className="hidden sm:flex" />
        </div>
        <FuelChips selected={selectedFuel} onChange={setSelectedFuel} />
      </div>

      {/* Map */}
      <div className="flex-1 pt-28">
        {mounted && (
          <MapContainer
            center={[40.1872, 44.5152]}
            zoom={8}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {visibleStations.map((station) => {
              const icon = createCustomIcon(station.brandColor);
              const price = station.prices.find(p => p.type === selectedFuel);
              return (
                <Marker
                  key={station.id}
                  position={[station.lat, station.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => onStationSelect(station),
                  }}
                >
                  <Popup>
                    <div className="text-center p-1">
                      <p className="font-semibold text-slate-900">{station.name}</p>
                      {price && (
                        <p className="text-lg font-bold text-emerald-600">{price.price} ֏</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Bottom Sheet */}
      <div
        className={cn(
          'absolute bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-lg border-t border-slate-200 transition-all duration-300 z-[1000]',
          sheetExpanded ? 'h-[60%]' : 'h-[240px]'
        )}
      >
        {/* Handle */}
        <button
          onClick={() => setSheetExpanded(!sheetExpanded)}
          className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-slate-300 rounded-full"
        />

        <div className="px-4 pt-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{visibleStations.length} заправок рядом</span>
              <ChevronUp 
                className={cn(
                  'w-4 h-4 text-slate-400 transition-transform',
                  sheetExpanded && 'rotate-180'
                )}
              />
            </div>
            <div className="flex bg-slate-100 rounded-full p-0.5">
              <button
                onClick={() => setSortBy('distance')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  sortBy === 'distance'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                )}
              >
                Ближе
              </button>
              <button
                onClick={() => setSortBy('price')}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  sortBy === 'price'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                )}
              >
                Дешевле
              </button>
            </div>
          </div>

          {/* Station List */}
          <div className="space-y-3 overflow-y-auto" style={{ maxHeight: sheetExpanded ? 'calc(60vh - 100px)' : '160px' }}>
            {(sheetExpanded ? sortedStations : nearbyStations).map((station) => {
              const price = station.prices.find(p => p.type === selectedFuel);
              return (
                <button
                  key={station.id}
                  onClick={() => onStationSelect(station)}
                  className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div
                    className="w-1 h-12 rounded-full"
                    style={{ backgroundColor: station.brandColor }}
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-slate-900">{station.name}</p>
                    <p className="text-sm text-slate-500">{station.address} · {station.distance} км</p>
                  </div>
                  {price && (
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">{price.price} ֏</p>
                      {price.trend < 0 && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <TrendingDown className="w-3 h-3" />
                          <span className="text-xs font-medium">↓ {Math.abs(price.trend)} ֏</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <BottomNav active="map" onNavigate={onNavigate} />

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
