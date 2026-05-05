'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  LocateFixed,
  MapPin,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { useAuth } from '@/lib/auth-store';
import { track } from '@/lib/analytics';
import { useUserLocation } from '@/lib/user-location';
import { useT } from '@/lib/locale-store';
import { BRANDS } from '@/lib/brands';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const MapCenterTracker = dynamic(
  () =>
    import('react-leaflet').then(({ useMapEvents }) => {
      const Inner = ({ onChange }: { onChange: (lat: number, lng: number) => void }) => {
        useMapEvents({
          moveend: (e) => {
            const c = e.target.getCenter();
            onChange(c.lat, c.lng);
          },
        });
        return null;
      };
      return Inner;
    }),
  { ssr: false }
);

const YEREVAN: [number, number] = [40.1872, 44.5152];
const MAX_DIM = 1600;
const JPEG_QUALITY = 0.82;

async function resizeImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to read image'));
      img.src = url;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Encode failed'))),
        'image/jpeg',
        JPEG_QUALITY
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function reverseGeocode(lat: number, lng: number, locale: 'ru' | 'hy'): Promise<string | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${locale}`,
      { headers: { 'User-Agent': 'FuelMap-Armenia/1.0 (https://fuelmap.app)' } }
    );
    if (!r.ok) return null;
    const data = await r.json();
    return data?.display_name ?? null;
  } catch {
    return null;
  }
}

interface SubmitStationScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

type SubmitState = 'idle' | 'sending' | 'sent';

export function SubmitStationScreen({ onBack, onNavigate }: SubmitStationScreenProps) {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const { location, request: requestLocation } = useUserLocation();

  const [brand, setBrand] = useState<string>('');
  const [name, setName] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // Prices the user fills in. 92 / 95 / lpg required, diesel optional.
  // Stored as strings while editing so empty input doesn't auto-flip to 0.
  const [price92, setPrice92] = useState('');
  const [price95, setPrice95] = useState('');
  const [priceDiesel, setPriceDiesel] = useState('');
  const [priceLpg, setPriceLpg] = useState('');

  const [showMapPicker, setShowMapPicker] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reverse-geocode when coords change to suggest an address.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    reverseGeocode(coords.lat, coords.lng, 'ru').then((addr) => {
      if (!cancelled && addr) setAddress(addr);
    });
    return () => {
      cancelled = true;
    };
  }, [coords]);

  const useMyLocation = () => {
    if (location) {
      setCoords({ lat: location.lat, lng: location.lng });
    } else {
      requestLocation();
    }
  };
  // If geolocation resolves AFTER the click, react to it.
  useEffect(() => {
    if (location && !coords) setCoords({ lat: location.lat, lng: location.lng });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user) {
      onNavigate('login');
      return;
    }
    setError(null);
    setUploadingPhoto(true);
    try {
      const blob = await resizeImage(file);
      setPhotoPreview(URL.createObjectURL(blob));
      const path = `${user.id}/station_${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('price-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('price-photos').getPublicUrl(path);
      setPhotoUrl(pub.publicUrl);
    } catch (err: any) {
      setError(err?.message ?? t('submitStation.photo.uploadFailed'));
      setPhotoPreview(null);
      setPhotoUrl(null);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoUrl(null);
  };

  // Plausible Armenian per-litre range — keeps obvious typos out of the
  // submission flow before they hit the admin moderation queue.
  const isPlausiblePrice = (raw: string) => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 100 && n <= 1500;
  };

  const canSubmit =
    !!user
    && !!brand
    && !!coords
    && !uploadingPhoto
    && submitState !== 'sending'
    && isPlausiblePrice(price92)
    && isPlausiblePrice(price95)
    && isPlausiblePrice(priceLpg)
    && (priceDiesel === '' || isPlausiblePrice(priceDiesel));

  const handleSubmit = async () => {
    setError(null);
    if (!user) {
      onNavigate('login');
      return;
    }
    if (!brand || !coords) return;
    if (!isPlausiblePrice(price92) || !isPlausiblePrice(price95) || !isPlausiblePrice(priceLpg)) return;
    setSubmitState('sending');
    const { error: err } = await supabase.from('station_submissions').insert({
      user_id: user.id,
      brand,
      name: name.trim() || null,
      lat: coords.lat,
      lng: coords.lng,
      address: address.trim() || null,
      photo_url: photoUrl,
      price_92:     parseInt(price92, 10),
      price_95:     parseInt(price95, 10),
      price_lpg:    parseInt(priceLpg, 10),
      price_diesel: priceDiesel ? parseInt(priceDiesel, 10) : null,
    });
    if (err) {
      setSubmitState('idle');
      setError(err.message);
      track('station_submission_failed', { reason: err.message });
      return;
    }
    track('station_submission_submitted', {
      brand,
      has_photo: !!photoUrl,
      has_diesel: !!priceDiesel,
    });
    setSubmitState('sent');
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-semibold text-slate-900">{t('submitStation.title')}</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {!authLoading && !user && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t('submitStation.authRequired')}{' '}
            <button
              onClick={() => onNavigate('login')}
              className="font-semibold underline"
            >
              {t('submit.authRequiredCta')}
            </button>
          </div>
        )}

        {/* Brand */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-3 block">
            {t('submitStation.brand.label')}
          </label>
          <div className="flex flex-wrap gap-2">
            {BRANDS.map((b) => (
              <button
                key={b.slug}
                onClick={() => setBrand(b.slug)}
                className={cn(
                  'px-3 py-2 rounded-full text-sm font-medium border transition-colors',
                  brand === b.slug
                    ? 'border-transparent text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                )}
                style={brand === b.slug ? { backgroundColor: b.color } : undefined}
              >
                {b.displayName}
              </button>
            ))}
            <button
              onClick={() => setBrand('Other')}
              className={cn(
                'px-3 py-2 rounded-full text-sm font-medium border transition-colors',
                brand === 'Other'
                  ? 'bg-slate-700 border-transparent text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
              )}
            >
              {t('submitStation.brand.other')}
            </button>
          </div>
        </div>

        {/* Name (optional) */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-2 block">
            {t('submitStation.name.label')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('submitStation.name.placeholder')}
            maxLength={80}
            className="w-full h-11 px-4 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Location */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-2 block">
            {t('submitStation.location.label')}
          </label>

          {coords ? (
            <div className="bg-slate-50 rounded-xl p-3 mb-2">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </p>
                  {address && (
                    <p className="text-xs text-slate-500 mt-0.5 break-words">{address}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mb-2">{t('submitStation.location.empty')}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11"
              onClick={useMyLocation}
            >
              <LocateFixed className="w-4 h-4" />
              {t('submitStation.location.useMine')}
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 h-11"
              onClick={() => setShowMapPicker(true)}
            >
              <MapPin className="w-4 h-4" />
              {t('submitStation.location.pickMap')}
            </Button>
          </div>

          {coords && (
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('submitStation.address.placeholder')}
              className="mt-2 w-full h-11 px-4 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          )}
        </div>

        {/* Photo */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-2 block">
            {t('submitStation.photo.label')}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
              <img src={photoPreview} alt="" className="w-full max-h-48 object-cover" />
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {!uploadingPhoto && (
                <button
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  aria-label="X"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center bg-slate-50 hover:bg-slate-100 hover:border-emerald-400 transition-colors disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-emerald-600" />
                )}
              </div>
              <p className="text-sm text-slate-700 text-center">
                {uploadingPhoto ? t('submit.photo.uploading') : t('submitStation.photo.shoot')}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Upload className="w-3 h-3" />
                {t('submit.photo.gallery')}
              </p>
            </button>
          )}
        </div>

        {/* Prices */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-2 block">
            {t('submitStation.prices.label')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <PriceInput
              label="Regular *"
              value={price92}
              onChange={setPrice92}
            />
            <PriceInput
              label="Premium *"
              value={price95}
              onChange={setPrice95}
            />
            <PriceInput
              label="LPG *"
              value={priceLpg}
              onChange={setPriceLpg}
            />
            <PriceInput
              label="Diesel"
              value={priceDiesel}
              onChange={setPriceDiesel}
              optional
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {t('submitStation.prices.hint')}
          </p>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {submitState === 'sent' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{t('submitStation.success')}</p>
          </div>
        ) : (
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            disabled={!canSubmit}
          >
            {submitState === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('submit.cta.submitting')}
              </>
            ) : (
              t('submitStation.cta.submit')
            )}
          </Button>
        )}
      </div>

      <BottomNav active="add" onNavigate={onNavigate} />

      {/* Map picker modal */}
      {showMapPicker && (
        <MapPickerModal
          initial={coords ?? (location ? { lat: location.lat, lng: location.lng } : null)}
          onCancel={() => setShowMapPicker(false)}
          onConfirm={(lat, lng) => {
            setCoords({ lat, lng });
            setShowMapPicker(false);
          }}
        />
      )}

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

interface MapPickerModalProps {
  initial: { lat: number; lng: number } | null;
  onCancel: () => void;
  onConfirm: (lat: number, lng: number) => void;
}

function MapPickerModal({ initial, onCancel, onConfirm }: MapPickerModalProps) {
  const t = useT();
  const [center, setCenter] = useState<[number, number]>(
    initial ? [initial.lat, initial.lng] : YEREVAN
  );

  return (
    <div className="fixed inset-0 z-[3000] bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <button
          onClick={onCancel}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg"
          aria-label="back"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h2 className="text-base font-semibold text-slate-900">
          {t('submitStation.mapPicker.title')}
        </h2>
        <div className="w-9" />
      </div>

      <div className="relative flex-1">
        <MapContainer
          center={center}
          zoom={15}
          scrollWheelZoom
          className="w-full h-full"
          attributionControl={false}
        >
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapCenterTracker onChange={(lat, lng) => setCenter([lat, lng])} />
        </MapContainer>

        {/* Fixed crosshair overlay — stays put while map pans */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-[1100]">
          <div className="-translate-y-3">
            <MapPin className="w-9 h-9 text-emerald-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]" fill="#10b981" />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 z-[1100]">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 mb-2 text-xs text-slate-600 text-center">
            {center[0].toFixed(5)}, {center[1].toFixed(5)}
          </div>
          <Button
            onClick={() => onConfirm(center[0], center[1])}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold"
          >
            {t('submitStation.mapPicker.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span
        className={
          optional
            ? 'text-xs text-slate-500'
            : 'text-xs text-slate-700 font-medium'
        }
      >
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="—"
          className="w-full h-11 pl-3 pr-7 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
          ֏
        </span>
      </div>
    </label>
  );
}
