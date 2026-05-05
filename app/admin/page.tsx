'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListChecks, MapPin, Store, Users, Wallet, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Counts {
  pendingPrices: number;
  pendingStations: number;
  totalUsers: number;
  totalBalance: number;
  brandOverrides: number;
}

export default function AdminDashboard() {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [
        { count: pendingPrices },
        { count: pendingStations },
        { count: totalUsers },
        { data: balanceData },
        { count: brandOverrides },
      ] = await Promise.all([
        supabase
          .from('price_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('station_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        // auth.users count via RPC; fall back to 0 if RPC not exposed.
        supabase.rpc('user_count').then(
          (r) => (r.error ? { count: 0 } : { count: (r.data as number) ?? 0 })
        ),
        supabase.from('user_balance').select('amount_amd'),
        supabase
          .from('brand_price_overrides')
          .select('*', { count: 'exact', head: true }),
      ]);

      const totalBalance =
        (balanceData ?? []).reduce((sum, r: any) => sum + (r.amount_amd ?? 0), 0);

      if (cancelled) return;
      setCounts({
        pendingPrices: pendingPrices ?? 0,
        pendingStations: pendingStations ?? 0,
        totalUsers: totalUsers ?? 0,
        totalBalance,
        brandOverrides: brandOverrides ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!counts) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Обзор</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card
          href="/admin/prices"
          icon={ListChecks}
          label="Цены на проверке"
          value={counts.pendingPrices}
          accent={counts.pendingPrices > 0 ? 'amber' : 'slate'}
        />
        <Card
          href="/admin/stations"
          icon={MapPin}
          label="Заявки на АЗС"
          value={counts.pendingStations}
          accent={counts.pendingStations > 0 ? 'amber' : 'slate'}
        />
        <Card
          href="/admin/users"
          icon={Users}
          label="Пользователи"
          value={counts.totalUsers}
        />
        <Card
          href="/admin/users"
          icon={Wallet}
          label="Сумма балансов"
          valueText={`${counts.totalBalance.toLocaleString('ru-RU')} ֏`}
        />
        <Card
          href="/admin/brand-prices"
          icon={Store}
          label="Оверрайды цен брендов"
          value={counts.brandOverrides}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <p className="text-sm font-medium text-slate-700 mb-2">Подсказка</p>
        <p className="text-sm text-slate-500">
          Telegram-бот шлёт ссылки на новые заявки прямо в админку. Если канал
          молчит — проверь что в private.app_settings заполнены telegram_bot_token и
          telegram_chat_id.
        </p>
      </div>
    </div>
  );
}

function Card({
  href,
  icon: Icon,
  label,
  value,
  valueText,
  accent = 'slate',
}: {
  href: string;
  icon: typeof ListChecks;
  label: string;
  value?: number;
  valueText?: string;
  accent?: 'slate' | 'amber';
}) {
  const ring =
    accent === 'amber'
      ? 'border-amber-300 bg-amber-50/40'
      : 'border-slate-200 bg-white';
  return (
    <Link
      href={href}
      className={`block rounded-xl border ${ring} p-5 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-semibold text-slate-900">
        {valueText ?? value?.toLocaleString('ru-RU') ?? 0}
      </p>
    </Link>
  );
}
