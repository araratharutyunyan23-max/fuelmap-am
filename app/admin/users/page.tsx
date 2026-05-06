'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UserRow {
  user_id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  balance_amd: number;
  total_earned_amd: number;
  price_reports: number;
  station_submissions: number;
  station_reviews: number;
  favorites: number;
  push_subscribed: boolean;
  is_seed: boolean;
}

function relTime(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} д назад`;
  const mo = Math.round(d / 30);
  return `${mo} мес назад`;
}

function totalActions(r: UserRow): number {
  return r.price_reports + r.station_submissions + r.station_reviews + r.favorites;
}

type Filter = 'all' | 'active' | 'idle' | 'no-show';

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [hideSeed, setHideSeed] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase.rpc('admin_user_engagement');
    if (err) setError(err.message);
    else setRows((data ?? []) as UserRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (hideSeed) list = list.filter((r) => !r.is_seed);
    if (filter === 'active') {
      // Returned at least once after registering OR did anything OR enabled push.
      list = list.filter((r) => {
        const created = new Date(r.created_at).getTime();
        const last = r.last_sign_in_at ? new Date(r.last_sign_in_at).getTime() : 0;
        return last - created > 60_000 || totalActions(r) > 0 || r.push_subscribed;
      });
    } else if (filter === 'idle') {
      list = list.filter((r) => {
        const created = new Date(r.created_at).getTime();
        const last = r.last_sign_in_at ? new Date(r.last_sign_in_at).getTime() : 0;
        return last - created < 60_000 && totalActions(r) === 0 && !r.push_subscribed;
      });
    } else if (filter === 'no-show') {
      list = list.filter((r) => !r.last_sign_in_at);
    }
    // Default sort: most-engaged first (total actions desc, then balance, then last seen).
    return [...list].sort((a, b) => {
      const da = totalActions(b) - totalActions(a);
      if (da !== 0) return da;
      const db = b.balance_amd - a.balance_amd;
      if (db !== 0) return db;
      const la = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0;
      const lb = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0;
      return la - lb;
    });
  }, [rows, filter, hideSeed]);

  const stats = useMemo(() => {
    const real = rows.filter((r) => !r.is_seed);
    return {
      total: real.length,
      active: real.filter(
        (r) =>
          (r.last_sign_in_at &&
            new Date(r.last_sign_in_at).getTime() - new Date(r.created_at).getTime() > 60_000) ||
          totalActions(r) > 0 ||
          r.push_subscribed
      ).length,
      pushEnabled: real.filter((r) => r.push_subscribed).length,
      contributors: real.filter((r) => r.price_reports + r.station_submissions > 0).length,
    };
  }, [rows]);

  const markPaid = async (userId: string) => {
    if (!confirm('Зафиксировать выплату? Баланс юзера обнулится. (total_earned остаётся.)')) return;
    setBusy(userId);
    setError(null);
    const { error: err } = await supabase
      .from('user_balance')
      .update({ amount_amd: 0, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Пользователи</h1>
      <p className="text-sm text-slate-500 mb-6">
        Сортировка по убыванию активности (price_reports + станции + отзывы + избранное),
        потом по балансу, потом по дате последнего входа.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Всего" value={stats.total} />
        <StatCard label="Активные" value={stats.active} accent="emerald" />
        <StatCard label="Push включён" value={stats.pushEnabled} accent="emerald" />
        <StatCard label="Контрибьюторы" value={stats.contributors} accent="emerald" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all', 'active', 'idle', 'no-show'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border',
              filter === f
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            {f === 'all' && 'Все'}
            {f === 'active' && 'Активные'}
            {f === 'idle' && 'Только зарегистрировались'}
            {f === 'no-show' && 'Не подтвердили email'}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={hideSeed}
            onChange={(e) => setHideSeed(e.target.checked)}
            className="accent-emerald-600"
          />
          Скрыть seed-аккаунты
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          Нет совпадений.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-3 py-3">Юзер</th>
                <th className="px-3 py-3">Регистрация</th>
                <th className="px-3 py-3">Последний вход</th>
                <th className="px-3 py-3 text-center" title="Push-подписка">
                  Push
                </th>
                <th className="px-3 py-3 text-center" title="Цены / Станции / Отзывы / Избранное">
                  Действия
                </th>
                <th className="px-3 py-3 text-right">Баланс</th>
                <th className="px-3 py-3 text-right">Заработано</th>
                <th className="px-3 py-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.user_id} className="hover:bg-slate-50">
                  <td className="px-3 py-3">
                    <div className="text-slate-900 truncate max-w-[200px]" title={r.email ?? ''}>
                      {r.email ?? <span className="text-slate-400">—</span>}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                      {r.user_id.slice(0, 8)}…
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-500">{relTime(r.created_at)}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {r.last_sign_in_at ? relTime(r.last_sign_in_at) : 'не входил'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {r.push_subscribed ? (
                      <Bell className="w-4 h-4 text-emerald-600 inline" />
                    ) : (
                      <BellOff className="w-4 h-4 text-slate-300 inline" />
                    )}
                  </td>
                  <td className="px-3 py-3 text-center text-xs text-slate-700 font-mono">
                    {r.price_reports}/{r.station_submissions}/{r.station_reviews}/{r.favorites}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                    {r.balance_amd > 0 ? `${r.balance_amd.toLocaleString('ru-RU')} ֏` : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-slate-500">
                    {r.total_earned_amd > 0
                      ? `${r.total_earned_amd.toLocaleString('ru-RU')} ֏`
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {r.balance_amd > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markPaid(r.user_id)}
                        disabled={busy === r.user_id}
                        className="gap-1 text-xs"
                      >
                        {busy === r.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Выплачено
                      </Button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = 'slate',
}: {
  label: string;
  value: number;
  accent?: 'slate' | 'emerald';
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p
        className={cn(
          'text-2xl font-semibold',
          accent === 'emerald' ? 'text-emerald-700' : 'text-slate-900'
        )}
      >
        {value}
      </p>
    </div>
  );
}
