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
  Bell,
  BellOff,
  Star,
  Smartphone,
  Globe,
} from 'lucide-react';
import { installArticleUrl, isAppInstalled } from '@/lib/install-link';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  getCurrentSubscription,
  isIOS,
  isPushSupported,
  isStandaloneDisplay,
  pushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';
import { useFavorites } from '@/lib/favorites-store';
import { useBalance } from '@/lib/balance-store';
import { Wallet, ArrowUpRight } from 'lucide-react';
import { useStations } from '@/lib/stations-store';
import { type Station } from '@/lib/data';
import { BottomNav } from '@/components/bottom-nav';
import { useAuth } from '@/lib/auth-store';
import { useT, useLocale } from '@/lib/locale-store';
import { supabase } from '@/lib/supabase';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
  onStationSelect?: (station: Station) => void;
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

export function ProfileScreen({ onNavigate, onStationSelect }: ProfileScreenProps) {
  const t = useT();
  const { locale } = useLocale();
  const { user, signOut } = useAuth();
  const { favoriteIds } = useFavorites();
  const { stations } = useStations();
  const { balance } = useBalance();
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

  const favoriteStations = useMemo(
    () => stations.filter((s) => favoriteIds.has(s.id)),
    [stations, favoriteIds]
  );

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

      {/* Balance — show only for signed-in users */}
      {user && <BalanceCard balance={balance.amount} />}

      {/* Install-as-PWA CTA — auto-hidden once running standalone. Visible
          to guests too: a non-logged-in user is the most likely to need it. */}
      <InstallCard />

      {/* Language picker — visible to everyone, including guests. */}
      <LanguageRow />

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

      {/* Push notifications toggle */}
      {user && <PushToggle />}

      {/* Admin area lives at /admin now — link is shown so admins can jump there from profile */}
      {isAdmin && (
        <div className="px-4 pt-4">
          <a
            href="/admin"
            className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="flex-1 font-medium text-slate-900">{t('profile.adminLink')}</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </a>
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

      {/* Favorite stations */}
      {user && favoriteStations.length > 0 && (
        <div className="px-4 pt-6">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">
            {t('favorites.section.title')}{' '}
            <span className="font-normal text-slate-400">({favoriteStations.length})</span>
          </h2>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100">
            {favoriteStations.map((s) => (
              <button
                key={s.id}
                onClick={() => onStationSelect?.(s)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div
                  className="w-1 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: s.brandColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                  <p className="text-xs text-slate-500 truncate">{s.address}</p>
                </div>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
              </button>
            ))}
          </div>
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

// Reward balance card. Shows accumulated AMD, progress bar to the
// withdrawal threshold, and either a "keep going" hint or a CTA that
// opens our personal Telegram contact for manual payout.
const WITHDRAWAL_THRESHOLD = 500;
const WITHDRAWAL_TG = 'https://t.me/fuelmap_armenia';

function BalanceCard({ balance }: { balance: number }) {
  const t = useT();
  const canWithdraw = balance >= WITHDRAWAL_THRESHOLD;
  const remaining = Math.max(0, WITHDRAWAL_THRESHOLD - balance);
  const progress = Math.min(100, Math.round((balance / WITHDRAWAL_THRESHOLD) * 100));

  return (
    <div className="px-4 pt-4">
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-700 uppercase tracking-wide font-medium">
              {t('profile.balance.title')}
            </p>
            <p className="text-2xl font-bold text-slate-900 leading-tight">
              {balance.toLocaleString('ru-RU')} ֏
            </p>
          </div>
        </div>

        {!canWithdraw ? (
          <>
            <div className="h-2 bg-emerald-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              {t('profile.balance.progress', { remaining: String(remaining) })}
            </p>
          </>
        ) : (
          <a
            href={WITHDRAWAL_TG}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
          >
            {t('profile.balance.withdraw')}
            <ArrowUpRight className="w-4 h-4" />
          </a>
        )}

        <p className="text-[11px] text-slate-500 mt-3">
          {t('profile.balance.howEarned')}
        </p>
      </div>
    </div>
  );
}

function LanguageRow() {
  const t = useT();
  return (
    <div className="px-4 pt-4">
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
          <Globe className="w-5 h-5 text-slate-500" />
        </div>
        <p className="flex-1 font-medium text-slate-900">{t('profile.language')}</p>
        <LanguageSwitcher />
      </div>
    </div>
  );
}

// Hides itself when the page is already running as an installed PWA.
// Same Telegraph article as on onboarding, picked by locale + platform.
function InstallCard() {
  const t = useT();
  const { locale } = useLocale();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAppInstalled()) return;
    setUrl(installArticleUrl(locale));
  }, [locale]);

  if (!url) return null;

  return (
    <div className="px-4 pt-4">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900">{t('profile.install.title')}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('profile.install.subtitle')}</p>
        </div>
        <ArrowUpRight className="w-5 h-5 text-slate-400" />
      </a>
    </div>
  );
}

// Toggle for Web Push subscription. Three states:
//   * supported + standalone + granted/subscribed → switch is on
//   * supported + standalone + default/no-sub    → switch is off; tap to subscribe
//   * supported + standalone + denied            → disabled, "включи в настройках"
//   * not supported / not standalone (iOS in Safari tab) → install hint
function PushToggle() {
  const t = useT();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [standalone, setStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupported(isPushSupported());
    setStandalone(isStandaloneDisplay());
    setPermission(pushPermission());
    getCurrentSubscription().then((s) => setSubscribed(!!s));
  }, []);

  if (supported === null) return null;

  // iOS Safari tab — Notification API isn't exposed; tell the user to install.
  if (isIOS() && !standalone) {
    return (
      <div className="px-4 pt-4">
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-900">{t('profile.notifications.title')}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('profile.notifications.iosInstallHint')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!supported) return null;

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const r = await subscribeToPush();
        if (r.ok) setSubscribed(true);
        setPermission(pushPermission());
      }
    } finally {
      setBusy(false);
    }
  };

  const isOn = !!subscribed && permission === 'granted';
  const isBlocked = permission === 'denied';

  return (
    <div className="px-4 pt-4">
      <button
        onClick={handleToggle}
        disabled={busy || isBlocked}
        className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left disabled:opacity-60 disabled:cursor-default"
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            isOn ? 'bg-emerald-100' : 'bg-slate-100'
          )}
        >
          {isOn ? (
            <Bell className="w-5 h-5 text-emerald-600" />
          ) : (
            <BellOff className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-slate-900">{t('profile.notifications.title')}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBlocked
              ? t('profile.notifications.blocked')
              : isOn
              ? t('profile.notifications.on')
              : t('profile.notifications.off')}
          </p>
        </div>
        <div
          className={cn(
            'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors',
            isOn ? 'bg-emerald-600' : 'bg-slate-300',
            isBlocked && 'bg-slate-200'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
              isOn && 'translate-x-5'
            )}
          />
        </div>
      </button>
    </div>
  );
}
