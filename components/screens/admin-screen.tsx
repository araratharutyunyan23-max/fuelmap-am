'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, X, ExternalLink, ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-store';
import { useStations } from '@/lib/stations-store';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/locale-store';
import { cn } from '@/lib/utils';

interface AdminScreenProps {
  onBack: () => void;
  highlightId?: string | null;
}

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

export function AdminScreen({ onBack, highlightId }: AdminScreenProps) {
  const t = useT();
  const { user, loading: authLoading } = useAuth();
  const { stations } = useStations();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionState>({});
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  // Check admin via RPC; works only when RLS lets the user call is_admin().
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (error) {
        setError(error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data));
      }
    });
  }, [user, authLoading]);

  // Load pending reports once we know the user is admin.
  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin]);

  // Scroll to the highlighted report when arriving from a Telegram link.
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

  // Loading / not-admin / not-logged-in states.
  if (authLoading || isAdmin === null) {
    return <FullScreenSpinner />;
  }
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header title={t('admin.title')} onBack={onBack} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-slate-700">{t('admin.notAdmin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header title={t('admin.title')} onBack={onBack} />

      <div className="px-4 py-4 space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <FullScreenSpinner />
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500 shadow-sm">
            {t('admin.empty')}
          </div>
        ) : (
          reports.map((r) => {
            const station = stationsById[r.station_id];
            const isHighlighted = r.id === highlightId;
            const inProgress = actions[r.id];
            return (
              <div
                key={r.id}
                ref={isHighlighted ? highlightRef : undefined}
                className={cn(
                  'bg-white rounded-xl shadow-sm overflow-hidden transition-shadow',
                  isHighlighted && 'ring-2 ring-emerald-500'
                )}
              >
                {r.photo_url && (
                  <a
                    href={r.photo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={r.photo_url}
                      alt=""
                      className="w-full max-h-64 object-cover"
                    />
                  </a>
                )}
                <div className="p-4 space-y-2">
                  {station && (
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-12 rounded-full flex-shrink-0"
                        style={{ backgroundColor: station.brandColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {station.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {station.address}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-slate-500">{t('admin.report.fuel')}</span>
                    <span className="font-medium text-slate-900">{r.label}</span>
                    <span className="text-slate-500">{t('admin.report.price')}</span>
                    <span className="font-medium text-slate-900">
                      {r.price} {t('common.amd')}
                    </span>
                    <span className="text-slate-500">{t('admin.report.user')}</span>
                    <span className="font-mono text-xs text-slate-700 truncate">
                      {r.user_id.slice(0, 8)}…
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
                      {t('admin.report.viewPhoto')}
                    </a>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleAction(r.id, 'confirmed')}
                      disabled={!!inProgress}
                      className="flex-1 h-10 gap-1 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                    >
                      {inProgress === 'confirming' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {t('admin.confirm')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction(r.id, 'rejected')}
                      disabled={!!inProgress}
                      className="flex-1 h-10 gap-1 rounded-lg border-slate-300"
                    >
                      {inProgress === 'rejecting' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {t('admin.reject')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}
