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
  Store,
  Users,
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
  // The login route is the one place the shell shouldn't gate on auth —
  // that'd loop forever. Render the form raw, full-screen, no sidebar.
  const isLogin = pathname === '/admin/login';
  const [state, setState] = useState<'loading' | 'unauth' | 'not-admin' | 'ok'>('loading');
  const [email, setEmail] = useState<string | null>(null);

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
  }, []);

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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200">
          <p className="text-base font-semibold text-slate-900">FuelMap Admin</p>
          <p className="text-xs text-slate-500 truncate">{email}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
