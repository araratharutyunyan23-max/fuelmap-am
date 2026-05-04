'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  User,
  ChevronRight,
  LogIn,
  LogOut,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import { BottomNav } from '@/components/bottom-nav';
import { useAuth } from '@/lib/auth-store';
import { useT, useLocale } from '@/lib/locale-store';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

interface MyReport {
  id: string;
  fuel_type: string;
  label: string;
  price: number;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  station: { name: string | null } | null;
}

function formatDate(iso: string, locale: 'ru' | 'hy'): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'hy' ? 'hy-AM' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const t = useT();
  const { locale } = useLocale();
  const { user, signOut } = useAuth();
  const displayName =
    (user?.user_metadata?.name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Guest';

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    supabase.rpc('is_admin').then(({ data }) => {
      if (!cancelled) setIsAdmin(Boolean(data));
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const [reports, setReports] = useState<MyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  useEffect(() => {
    if (!user) {
      setReports([]);
      return;
    }
    let cancelled = false;
    setReportsLoading(true);
    supabase
      .from('price_reports')
      .select('id, fuel_type, label, price, status, created_at, station:stations(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        setReports((data ?? []) as unknown as MyReport[]);
        setReportsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const total = reports.length;
    const confirmed = reports.filter((r) => r.status === 'confirmed').length;
    const pending = reports.filter((r) => r.status === 'pending').length;
    const rejected = reports.filter((r) => r.status === 'rejected').length;
    return { total, confirmed, pending, rejected };
  }, [reports]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Profile Header */}
      <div className="bg-white px-4 py-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 truncate">{displayName}</h1>
            {user?.email && (
              <p className="text-sm text-slate-400 mt-1 truncate">{user.email}</p>
            )}
          </div>
          {user ? (
            <button
              onClick={signOut}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
              title={t('profile.signOut')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1"
            >
              <LogIn className="w-4 h-4" />
              {t('profile.signIn')}
            </button>
          )}
        </div>
      </div>

      {/* "Submit a new station" — for any signed-in user */}
      {user && (
        <div className="px-4 pt-4">
          <button
            onClick={() => onNavigate('submit-station')}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <PlusCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="flex-1 font-medium text-slate-900">{t('profile.submitStation')}</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      )}

      {/* Admin link — only for admins */}
      {isAdmin && (
        <div className="px-4 pt-4">
          <button
            onClick={() => onNavigate('admin')}
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="flex-1 font-medium text-slate-900">{t('profile.adminLink')}</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      )}

      {/* My submissions */}
      {user && (
        <div className="px-4 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            {t('profile.mySubmissions.title')}{' '}
            {stats.total > 0 && (
              <span className="font-normal text-slate-400">({stats.total})</span>
            )}
          </h2>

          {reportsLoading ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-sm text-slate-400">
              {t('common.loading')}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-sm text-slate-400">
              {t('profile.mySubmissions.empty')}
            </div>
          ) : (
            <>
              {/* Tally row */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="bg-emerald-50 rounded-lg py-2">
                  <p className="text-lg font-semibold text-emerald-700">{stats.confirmed}</p>
                  <p className="text-[11px] text-emerald-600 uppercase tracking-wide">
                    {t('profile.mySubmissions.confirmed')}
                  </p>
                </div>
                <div className="bg-amber-50 rounded-lg py-2">
                  <p className="text-lg font-semibold text-amber-700">{stats.pending}</p>
                  <p className="text-[11px] text-amber-600 uppercase tracking-wide">
                    {t('profile.mySubmissions.pending')}
                  </p>
                </div>
                <div className="bg-slate-100 rounded-lg py-2">
                  <p className="text-lg font-semibold text-slate-700">{stats.rejected}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                    {t('profile.mySubmissions.rejected')}
                  </p>
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
                {reports.map((r) => {
                  const StatusIcon =
                    r.status === 'confirmed'
                      ? CheckCircle2
                      : r.status === 'rejected'
                      ? XCircle
                      : Clock;
                  const statusColor =
                    r.status === 'confirmed'
                      ? 'text-emerald-600'
                      : r.status === 'rejected'
                      ? 'text-slate-400'
                      : 'text-amber-500';
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3">
                      <StatusIcon className={cn('w-5 h-5 flex-shrink-0', statusColor)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {r.station?.name ?? '?'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t(`fuel.${r.fuel_type}` as TranslationKey)} · {r.price} ֏ ·{' '}
                          {formatDate(r.created_at, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Legal links */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <a href="/privacy" className="hover:text-slate-600 hover:underline">
            {t('profile.privacy')}
          </a>
          <span>·</span>
          <a href="/terms" className="hover:text-slate-600 hover:underline">
            {t('profile.terms')}
          </a>
        </div>
      </div>

      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  );
}
