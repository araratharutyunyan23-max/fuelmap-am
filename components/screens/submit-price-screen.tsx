'use client';

import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomNav } from '@/components/bottom-nav';
import { FUEL_TYPES } from '@/lib/data';
import { useStations } from '@/lib/stations-store';
import { useAuth } from '@/lib/auth-store';
import { useUserLocation } from '@/lib/user-location';
import { track } from '@/lib/analytics';
import { useT } from '@/lib/locale-store';
import type { TranslationKey } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// "I'm physically here" radius. Below this we trust geolocation enough to
// pre-select a station for the user. Above it we'd rather force them to
// search — submitting a price for the wrong AZS is worse than one extra tap.
const NEAR_RADIUS_KM = 0.1; // 100 m

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const MAX_DIM = 1600;
const JPEG_QUALITY = 0.82;

// Resize a File to fit within MAX_DIM × MAX_DIM, re-encode as JPEG.
// Saves bandwidth and dodges Supabase's 5MB bucket cap. Runs entirely in-browser.
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

interface SubmitPriceScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  initialStationId?: string | null;
}

type SubmitState = 'idle' | 'sending' | 'sent';

export function SubmitPriceScreen({ onBack, onNavigate, initialStationId }: SubmitPriceScreenProps) {
  const t = useT();
  const { stations, loading } = useStations();
  const { user, loading: authLoading } = useAuth();
  const { location } = useUserLocation();

  const [stationId, setStationId] = useState<string | null>(initialStationId ?? null);
  const [stationQuery, setStationQuery] = useState('');
  const [selectedFuel, setSelectedFuel] = useState('95');
  const [price, setPrice] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrCandidates, setOcrCandidates] = useState<number[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!user) {
      onNavigate('login');
      return;
    }
    setError(null);
    setUploadingPhoto(true);
    setOcrCandidates([]);

    try {
      const blob = await resizeImage(file);
      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreview(previewUrl);

      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('price-photos')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('price-photos').getPublicUrl(path);
      setPhotoUrl(pub.publicUrl);
      setUploadingPhoto(false);

      // Fire OCR in the background — non-blocking, failures are silent.
      setOcrLoading(true);
      try {
        const r = await fetch('/api/ocr-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: pub.publicUrl }),
        });
        const data = await r.json();
        const cands: number[] = Array.isArray(data?.candidates) ? data.candidates : [];
        setOcrCandidates(cands);
        // Auto-fill only when there's exactly one candidate — avoids guessing
        // when the photo shows the full board with several fuel types.
        if (cands.length === 1) setPrice(String(cands[0]));
      } catch {
        // OCR is best-effort; ignore network/parse errors.
      } finally {
        setOcrLoading(false);
      }
    } catch (err: any) {
      setError(err?.message ?? t('submit.photo.uploadFailed'));
      setPhotoPreview(null);
      setPhotoUrl(null);
      setUploadingPhoto(false);
    }
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoUrl(null);
    setOcrCandidates([]);
  };

  const fuelChips = FUEL_TYPES.filter((f) => ['92', '95', '98', 'diesel', 'lpg'].includes(f.id));

  // Station the user is physically standing at, if any. Empty when we
  // either don't have geolocation or the closest station is further than
  // NEAR_RADIUS_KM — better to make the user search than auto-pick a wrong
  // AZS and silently mis-attribute the price.
  const nearestStation = useMemo(() => {
    if (!location) return null;
    let best: { id: string; distKm: number } | null = null;
    for (const s of stations) {
      const distKm = haversineKm(location, { lat: s.lat, lng: s.lng });
      if (distKm <= NEAR_RADIUS_KM && (!best || distKm < best.distKm)) {
        best = { id: s.id, distKm };
      }
    }
    return best?.id ? stations.find((s) => s.id === best!.id) ?? null : null;
  }, [stations, location]);

  const selectedStation = useMemo(() => {
    // 1. Came in from a station detail screen.
    if (stationId) return stations.find((s) => s.id === stationId) ?? null;
    // 2. User is physically at an AZS — pre-select it to save a tap.
    if (nearestStation) return nearestStation;
    // 3. Otherwise force search — never default to a random station.
    return null;
  }, [stationId, nearestStation, stations]);

  const stationMatches = useMemo(() => {
    const q = stationQuery.trim().toLowerCase();
    if (!q) return [];
    return stations
      .filter((s) => s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q))
      .slice(0, 8);
  }, [stationQuery, stations]);

  const handleSubmit = async () => {
    setError(null);
    if (!user) {
      onNavigate('login');
      return;
    }
    if (!selectedStation || !price) return;
    const fuel = fuelChips.find((f) => f.id === selectedFuel);
    if (!fuel) return;

    setSubmitState('sending');
    const { error: err } = await supabase.from('price_reports').insert({
      user_id: user.id,
      station_id: selectedStation.id,
      fuel_type: fuel.id,
      label: fuel.label,
      price: parseInt(price, 10),
      photo_url: photoUrl,
    });
    if (err) {
      setSubmitState('idle');
      setError(err.message);
      track('price_report_failed', { reason: err.message });
      return;
    }
    setSubmitState('sent');
    track('price_report_submitted', {
      brand: selectedStation.brand,
      fuel: fuel.id,
      has_photo: !!photoUrl,
    });
    setPrice('');
    removePhoto();
  };

  const submitDisabled =
    !price || !selectedStation || submitState === 'sending' || authLoading || loading;

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
          <h1 className="text-lg font-semibold text-slate-900">{t('submit.title')}</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        {!authLoading && !user && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {t('submit.authRequired')}{' '}
            <button
              onClick={() => onNavigate('login')}
              className="font-semibold underline"
            >
              {t('submit.authRequiredCta')}
            </button>
          </div>
        )}

        {/* Photo Upload Zone */}
        <div className="mb-6">
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
              <img src={photoPreview} alt="Фото табло" className="w-full max-h-64 object-cover" />
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
              {!uploadingPhoto && (
                <button
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  aria-label="Убрать фото"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border-t border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                {t('submit.photo.replace')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 hover:border-emerald-400 transition-colors disabled:opacity-50"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                {uploadingPhoto ? (
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-emerald-600" />
                )}
              </div>
              <p className="text-slate-700 font-medium text-center mb-2">
                {uploadingPhoto ? t('submit.photo.uploading') : t('submit.photo.shoot')}
              </p>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Upload className="w-4 h-4" />
                {t('submit.photo.gallery')}
              </p>
            </button>
          )}
        </div>

        {/* Station picker */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-2 block">{t('submit.station.label')}</label>
          {selectedStation ? (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl mb-3">
              <div
                className="w-1 h-10 rounded-full"
                style={{ backgroundColor: selectedStation.brandColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{selectedStation.name}</p>
                <p className="text-sm text-slate-500 truncate">{selectedStation.address}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-3">
              <Search className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-900 flex-1">{t('submit.station.empty')}</p>
            </div>
          )}
          <input
            type="text"
            value={stationQuery}
            onChange={(e) => setStationQuery(e.target.value)}
            placeholder={t('submit.station.searchPlaceholder')}
            className="w-full h-11 px-4 bg-slate-50 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {stationMatches.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {stationMatches.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setStationId(s.id);
                    setStationQuery('');
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                >
                  <div
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.brandColor }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.address}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fuel Type Selection */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-500 mb-3 block">{t('submit.fuel.label')}</label>
          <div className="flex flex-wrap gap-2">
            {fuelChips.map((fuel) => (
              <button
                key={fuel.id}
                onClick={() => setSelectedFuel(fuel.id)}
                className={cn(
                  'px-4 py-2.5 rounded-full text-sm font-medium transition-colors',
                  selectedFuel === fuel.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {t(`fuel.${fuel.id}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Price Input */}
        <div className="mb-8">
          <label className="text-sm font-medium text-slate-500 mb-3 block">{t('submit.price.label')}</label>

          {ocrLoading && (
            <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('submit.ocr.detecting')}
            </div>
          )}

          {!ocrLoading && ocrCandidates.length > 1 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 mb-2">{t('submit.ocr.candidates')}</p>
              <div className="flex flex-wrap gap-2">
                {ocrCandidates.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPrice(String(c))}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                      price === String(c)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    {c} ֏
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-full text-center text-5xl font-bold text-slate-900 bg-slate-50 rounded-2xl py-6 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-3xl font-medium text-slate-400">
              ֏
            </span>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600">{error}</p>
        )}

        {submitState === 'sent' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              {t('submit.success')}
            </p>
          </div>
        ) : (
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            disabled={submitDisabled}
          >
            {submitState === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('submit.cta.submitting')}
              </>
            ) : (
              t('submit.cta.submit')
            )}
          </Button>
        )}
      </div>

      <BottomNav active="add" onNavigate={onNavigate} />
    </div>
  );
}
