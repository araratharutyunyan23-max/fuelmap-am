'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Search, SlidersHorizontal, ChevronUp, TrendingDown, Check, LocateFixed, Loader2, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { FuelChips } from '@/components/fuel-chips';
import { BottomNav } from '@/components/bottom-nav';
import { type Station } from '@/lib/data';
import { useStations } from '@/lib/stations-store';
import { useUserLocation } from '@/lib/user-location';
import { useT } from '@/lib/locale-store';
import { getBrand } from '@/lib/brands';
import { cn } from '@/lib/utils';

function computeAllBrands(stations: Station[]) {
  const counts: Record<string, { count: number; color: string }> = {};
  for (const s of stations) {
    if (!counts[s.brand]) counts[s.brand] = { count: 0, color: s.brandColor };
    counts[s.brand].count++;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
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
const RecenterOnUser = dynamic(
  () =>
    import('react-leaflet').then(({ useMap }) => {
      const Inner = ({ location }: { location: { lat: number; lng: number } | null }) => {
        const map = useMap();
        useEffect(() => {
          if (location) map.flyTo([location.lat, location.lng], 14);
        }, [location, map]);
        return null;
      };
      return Inner;
    }),
  { ssr: false }
);

interface MapScreenProps {
  onNavigate: (screen: string) => void;
  onStationSelect: (station: Station) => void;
}

function createCustomIcon(color: string, initial: string, muted = false) {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  // `muted` = no data for the currently selected fuel: low opacity so the
  // marker is still visible on the map but visually de-emphasised.
  const opacity = muted ? 0.35 : 1;
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 32px; height: 32px; background-color: ${color}; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); opacity: ${opacity}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 11px; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">${initial}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function createUserIcon() {
  if (typeof window === 'undefined') return undefined;
  const L = require('leaflet');
  return L.divIcon({
    className: 'user-marker',
    html: `<div style="position:relative;width:20px;height:20px;">
      <div style="position:absolute;inset:0;background-color:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 1px #3b82f6, 0 4px 12px rgba(59,130,246,0.5);"></div>
      <div style="position:absolute;inset:-12px;border-radius:50%;background-color:#3b82f6;opacity:0.18;animation:userpulse 2s ease-out infinite;"></div>
    </div>
    <style>@keyframes userpulse{0%{transform:scale(0.6);opacity:0.5}100%{transform:scale(1.4);opacity:0}}</style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function MapScreen({ onNavigate, onStationSelect }: MapScreenProps) {
  const t = useT();
  const { stations, loading } = useStations();
  const { location, requesting, error: locationError, request: requestLocation } = useUserLocation();
  const [selectedFuel, setSelectedFuel] = useState('95');
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance');
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showBrandFilter, setShowBrandFilter] = useState(false);
  const [showLocationError, setShowLocationError] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);
  const allBrands = useMemo(() => computeAllBrands(stations), [stations]);

  useEffect(() => {
    if (locationError) setShowLocationError(true);
  }, [locationError]);

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

  const visibleStations = useMemo(() => {
    let result = selectedBrands.size === 0 ? stations : stations.filter(s => selectedBrands.has(s.brand));
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
      );
    }
    return result;
  }, [selectedBrands, stations, searchQuery]);

  // Stations that actually have a price for the currently selected fuel.
  // The bottom-sheet list shows only these — empty rows are confusing UX.
  const stationsWithFuel = useMemo(
    () => visibleStations.filter(s => s.prices.some(p => p.type === selectedFuel)),
    [visibleStations, selectedFuel]
  );

  const sortedStations = useMemo(() => [...stationsWithFuel].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    const priceA = a.prices.find(p => p.type === selectedFuel)!.price;
    const priceB = b.prices.find(p => p.type === selectedFuel)!.price;
    return priceA - priceB;
  }), [stationsWithFuel, sortBy, selectedFuel]);

  const nearbyStations = sortedStations.slice(0, 3);

  return (
    <div className="relative h-dvh flex flex-col bg-slate-50">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('map.searchPlaceholder')}
              className="w-full pl-9 pr-9 py-2.5 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-[2000] overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 flex-shrink-0">
                  <span className="text-sm font-semibold text-slate-900">{t('map.brands.title')}</span>
                  {selectedBrands.size > 0 && (
                    <button
                      onClick={() => setSelectedBrands(new Set())}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      {t('map.brands.reset')}
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto py-1 overscroll-contain">
                  {allBrands.map(({ name, count, color }) => {
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
              </div>
            )}
          </div>
          <LanguageSwitcher className="hidden sm:flex" />
        </div>
        <FuelChips selected={selectedFuel} onChange={setSelectedFuel} />
      </div>

      {/* Map */}
      <div className="flex-1 pt-28 relative">
        {/* My-location button — sits above the bottom sheet, lower-right */}
        <button
          onClick={requestLocation}
          disabled={requesting}
          aria-label="Моё местоположение"
          className={cn(
            'absolute right-4 z-[1100] w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center transition-colors',
            location ? 'text-blue-600' : 'text-slate-600',
            requesting && 'opacity-70 cursor-wait',
            'hover:bg-slate-50'
          )}
          style={{ bottom: 'calc(240px + 12px)' }}
        >
          {requesting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LocateFixed className="w-5 h-5" />
          )}
        </button>

        {showLocationError && locationError && (
          <div className="absolute right-4 left-4 z-[1100] flex items-start gap-2 bg-white shadow-lg border border-red-200 rounded-xl px-3 py-2 text-sm text-red-700"
               style={{ bottom: 'calc(240px + 64px)' }}>
            <span className="flex-1">{t(locationError as any)}</span>
            <button onClick={() => setShowLocationError(false)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
            <RecenterOnUser location={location} />
            {location && (
              <Marker
                position={[location.lat, location.lng]}
                icon={createUserIcon()}
              />
            )}
            {visibleStations.map((station) => {
              const price = station.prices.find(p => p.type === selectedFuel);
              const initial = getBrand(station.brand)?.initial ?? station.brand.slice(0, 2).toUpperCase();
              const icon = createCustomIcon(station.brandColor, initial, !price);
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
          'absolute left-0 right-0 bg-white rounded-t-2xl shadow-lg border-t border-slate-200 transition-all duration-300 z-[1000]',
          sheetExpanded ? 'h-[60%]' : 'h-[240px]'
        )}
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
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
              <span className="font-semibold text-slate-900">{t('map.bottomSheet.count', { n: stationsWithFuel.length })}</span>
              <ChevronUp 
                className={cn(
                  'w-4 h-4 text-slate-400 transition-transform',
                  sheetExpanded && 'rotate-180'
                )}
              />
            </div>
            <div className="flex bg-slate-100 rounded-full p-0.5">
              <button
                onClick={() => {
                  setSortBy('distance');
                  // Acquire / refresh user position so the sort actually means "from me".
                  // request() is a no-op if it's already in flight.
                  if (!location && !requesting) requestLocation();
                }}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  sortBy === 'distance'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500'
                )}
              >
                {t('map.sort.distance')}
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
                {t('map.sort.price')}
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
