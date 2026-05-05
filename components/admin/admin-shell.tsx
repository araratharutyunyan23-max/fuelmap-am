'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote,
  ChevronRight,
  LayoutDashboard,
  ListChecks,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Store,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const NAV: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
  { href: '/admin',               label: 'Дашборд',     icon: LayoutDashboard },
  { href: '/admin/prices',        label: 'Цены',        icon: ListChecks },
  { href: '/admin/stations',      label: 'АЗС-заявки',  icon: MapPin },
  { href: '/admin/brand-prices',  label: 'Цены брендов',icon: Store },
  { href: '/admin/users',         label: 'Пользователи',icon: Users },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  const [state, setState] = useState<'loading' | 'unauth' | 'not-admin' | 'ok'>('loading');
  const [email, setEmail] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever route changes — feels right on mobile.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        if (!cancelled) setState('unauth');
        return;
      }
      const { data: adminFlag, error } = await supabase.rpc('is_admin');
      if (cancelled) return;
      if (error || !adminFlag) {
        setState('not-admin');
      } else {
        setEmail(sess.session.user.email ?? null);
        setState('ok');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLogin]);

  useEffect(() => {
    if (state === 'unauth') router.replace('/admin/login');
  }, [state, router]);

  if (isLogin) {
    return <>{children}</>;
  }

  if (state === 'loading' || state === 'unauth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (state === 'not-admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <p className="text-lg font-semibold text-slate-900 mb-2">Нет доступа</p>
        <p className="text-sm text-slate-500 mb-6">
          Этот аккаунт не входит в список администраторов.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace('/admin/login');
          }}
          className="text-sm text-emerald-600 hover:underline"
        >
          Выйти и войти под другим аккаунтом
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {/* Mobile top bar — only shown <lg, hamburger opens the drawer */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
        <p className="text-sm font-semibold text-slate-900">FuelMap Admin</p>
        <div className="w-9" />
      </div>

      {/* Drawer overlay (mobile only when open) */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar — slide-in on mobile, static on desktop */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col',
          'transition-transform duration-200',
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">FuelMap Admin</p>
            <p className="text-xs text-slate-500 truncate">{email}</p>
          </div>
          {/* Close button — only mobile */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-1 -mr-1 -mt-1 hover:bg-slate-100 rounded"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <Banknote className="w-4 h-4" />
            <span>Открыть приложение</span>
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace('/admin/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
