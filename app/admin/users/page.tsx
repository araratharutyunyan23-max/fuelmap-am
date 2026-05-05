'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

interface BalanceRow {
  user_id: string;
  amount_amd: number;
  total_earned_amd: number;
  earned_this_month_amd: number;
  updated_at: string;
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('user_balance')
      .select('user_id, amount_amd, total_earned_amd, earned_this_month_amd, updated_at')
      .order('amount_amd', { ascending: false });
    if (err) setError(err.message);
    else setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

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
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Балансы пользователей</h1>
      <p className="text-sm text-slate-500 mb-6">
        Юзеры отсортированы по текущему балансу. Кнопка «Выплачено» обнуляет
        amount_amd (total_earned остаётся для статистики).
      </p>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          Балансов пока нет.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Юзер ID</th>
                <th className="px-4 py-3 text-right">Баланс</th>
                <th className="px-4 py-3 text-right">За месяц</th>
                <th className="px-4 py-3 text-right">Всего заработал</th>
                <th className="px-4 py-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.user_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {r.user_id}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {r.amount_amd.toLocaleString('ru-RU')} ֏
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {r.earned_this_month_amd.toLocaleString('ru-RU')} ֏
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {r.total_earned_amd.toLocaleString('ru-RU')} ֏
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.amount_amd > 0 ? (
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
                      <span className="text-xs text-slate-400">—</span>
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
