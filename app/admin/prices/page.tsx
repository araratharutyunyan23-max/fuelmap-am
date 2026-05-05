'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStations } from '@/lib/stations-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Report {
  id: string;
  station_id: string;
  fuel_type: string;
  label: string;
  price: number;
  photo_url: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

type ActionState = Record<string, 'confirming' | 'rejecting' | undefined>;

export default function AdminPricesPage() {
  const params = useSearchParams();
  const highlightId = params.get('highlight');
  const { stations } = useStations();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<ActionState>({});
  const [error, setError] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from('price_reports')
      .select('id, station_id, fuel_type, label, price, photo_url, status, created_at, user_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else setReports(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!highlightId || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, reports.length]);

  const stationsById = useMemo(
    () => Object.fromEntries(stations.map((s) => [s.id, s])),
    [stations]
  );

  const handleAction = async (id: string, status: 'confirmed' | 'rejected') => {
    setActions((a) => ({ ...a, [id]: status === 'confirmed' ? 'confirming' : 'rejecting' }));
    const { error: err } = await supabase
      .from('price_reports')
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
    setReports((rs) => rs.filter((r) => r.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">
        Цены на модерации <span className="text-base text-slate-400 font-normal">({reports.length})</span>
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
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          Очередь пуста — все цены отмодерированы.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const station = stationsById[r.station_id];
            const isHighlighted = r.id === highlightId;
            const inProgress = actions[r.id];
            return (
              <div
                key={r.id}
                ref={isHighlighted ? highlightRef : undefined}
                className={cn(
                  'bg-white rounded-xl border border-slate-200 overflow-hidden',
                  isHighlighted && 'ring-2 ring-emerald-500'
                )}
              >
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-0">
                  {r.photo_url ? (
                    <a
                      href={r.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img src={r.photo_url} alt="" className="w-full h-full max-h-48 object-cover" />
                    </a>
                  ) : (
                    <div className="bg-slate-50 flex items-center justify-center text-slate-400 text-xs min-h-[100px]">
                      нет фото
                    </div>
                  )}
                  <div className="p-4 space-y-2">
                    {station && (
                      <div className="flex items-start gap-3">
                        <div
                          className="w-1 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: station.brandColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{station.name}</p>
                          <p className="text-xs text-slate-500 truncate">{station.address}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <span className="text-slate-500">Топливо</span>
                      <span className="font-medium text-slate-900">{r.label}</span>
                      <span className="text-slate-500">Цена</span>
                      <span className="font-medium text-slate-900">{r.price} ֏</span>
                      <span className="text-slate-500">Юзер</span>
                      <span className="font-mono text-xs text-slate-700 truncate">{r.user_id.slice(0, 8)}…</span>
                      <span className="text-slate-500">Создано</span>
                      <span className="text-xs text-slate-700">
                        {new Date(r.created_at).toLocaleString('ru-RU')}
                      </span>
                    </div>

                    {r.photo_url && (
                      <a
                        href={r.photo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Открыть фото
                      </a>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleAction(r.id, 'confirmed')}
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
                        onClick={() => handleAction(r.id, 'rejected')}
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
