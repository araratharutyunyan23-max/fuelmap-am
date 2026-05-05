'use client';

import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, MapPin, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { getBrand } from '@/lib/brands';

interface Submission {
  id: string;
  user_id: string;
  brand: string;
  name: string | null;
  lat: number;
  lng: number;
  address: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  price_92: number | null;
  price_95: number | null;
  price_98: number | null;
  price_diesel: number | null;
  price_lpg: number | null;
}

type ActionState = Record<string, 'confirming' | 'rejecting' | undefined>;

export default function AdminStationsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<ActionState>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('station_submissions')
      .select('id, user_id, brand, name, lat, lng, address, photo_url, status, created_at, price_92, price_95, price_98, price_diesel, price_lpg')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else setSubmissions(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAction = async (id: string, status: 'confirmed' | 'rejected') => {
    setActions((a) => ({ ...a, [id]: status === 'confirmed' ? 'confirming' : 'rejecting' }));
    const { error: err } = await supabase
      .from('station_submissions')
      .update({ status })
      .eq('id', id);
    setActions((a) => {
      const next = { ...a };
      delete next[id];
      return next;
    });
    if (err) {
      setError(err.message);
      return;
    }
    setSubmissions((s) => s.filter((r) => r.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        Заявки на АЗС <span className="text-base text-slate-400 font-normal">({submissions.length})</span>
      </h1>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          Очередь пуста — все заявки рассмотрены.
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((s) => {
            const brand = getBrand(s.brand);
            const inProgress = actions[s.id];
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
                  {s.photo_url ? (
                    <a
                      href={s.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img src={s.photo_url} alt="" className="w-full h-full max-h-48 object-cover" />
                    </a>
                  ) : (
                    <div className="bg-slate-50 flex items-center justify-center text-slate-400 text-xs min-h-[100px]">
                      нет фото
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: brand?.color ?? '#64748b' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {s.name || s.brand}
                        </p>
                        {s.name && (
                          <p className="text-xs text-slate-500">{s.brand}</p>
                        )}
                        {s.address && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{s.address}</p>
                        )}
                      </div>
                    </div>

                    <a
                      href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=18/${s.lat}/${s.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                    >
                      <MapPin className="w-3 h-3" />
                      {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                    </a>

                    <div className="text-xs text-slate-500">
                      Юзер{' '}
                      <span className="font-mono text-slate-700">{s.user_id.slice(0, 8)}…</span>
                    </div>

                    {(s.price_92 || s.price_95 || s.price_diesel || s.price_lpg) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {s.price_92    && <PriceBadge label="Regular" amd={s.price_92} />}
                        {s.price_95    && <PriceBadge label="Premium" amd={s.price_95} />}
                        {s.price_98    && <PriceBadge label="Super"   amd={s.price_98} />}
                        {s.price_diesel && <PriceBadge label="Diesel"  amd={s.price_diesel} />}
                        {s.price_lpg   && <PriceBadge label="LPG"     amd={s.price_lpg} />}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleAction(s.id, 'confirmed')}
                        disabled={!!inProgress}
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        {inProgress === 'confirming' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Подтвердить
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleAction(s.id, 'rejected')}
                        disabled={!!inProgress}
                        className="gap-1"
                      >
                        {inProgress === 'rejecting' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Отклонить
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PriceBadge({ label, amd }: { label: string; amd: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-700">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold tabular-nums">{amd} ֏</span>
    </span>
  );
}
