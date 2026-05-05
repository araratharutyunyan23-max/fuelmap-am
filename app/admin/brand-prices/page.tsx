'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BRANDS } from '@/lib/brands';
import { Button } from '@/components/ui/button';

const FUELS = [
  { id: '92',     label: 'Regular' },
  { id: '95',     label: 'Premium' },
  { id: '98',     label: 'Super' },
  { id: 'diesel', label: 'Diesel' },
  { id: 'lpg',    label: 'LPG' },
];

interface Override {
  brand: string;
  fuel_type: string;
  price: number;
  updated_at: string;
}

type EditMap = Record<string, string>;

function key(brand: string, fuel: string) {
  return `${brand}|${fuel}`;
}

export default function AdminBrandPricesPage() {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<EditMap>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const overrideMap = useMemo(() => {
    const m = new Map<string, Override>();
    for (const o of overrides) m.set(key(o.brand, o.fuel_type), o);
    return m;
  }, [overrides]);

  const loadOverrides = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('brand_price_overrides')
      .select('brand, fuel_type, price, updated_at');
    if (err) setError(err.message);
    else setOverrides(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadOverrides();
  }, []);

  const save = async (brand: string, fuel: string) => {
    const k = key(brand, fuel);
    const raw = edits[k]?.trim() ?? '';
    if (!raw) return;
    const price = parseInt(raw, 10);
    if (!Number.isFinite(price) || price <= 0) {
      setError(`Неверная цена для ${brand} / ${fuel}`);
      return;
    }
    setSaving((s) => ({ ...s, [k]: true }));
    setError(null);
    const { data: userData } = await supabase.auth.getUser();
    const { error: err } = await supabase.from('brand_price_overrides').upsert(
      {
        brand,
        fuel_type: fuel,
        price,
        updated_by: userData.user?.id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'brand,fuel_type' }
    );
    setSaving((s) => {
      const next = { ...s };
      delete next[k];
      return next;
    });
    if (err) {
      setError(err.message);
      return;
    }
    setEdits((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
    await loadOverrides();
  };

  const remove = async (brand: string, fuel: string) => {
    const k = key(brand, fuel);
    setSaving((s) => ({ ...s, [k]: true }));
    setError(null);
    const { error: err } = await supabase
      .from('brand_price_overrides')
      .delete()
      .eq('brand', brand)
      .eq('fuel_type', fuel);
    setSaving((s) => {
      const next = { ...s };
      delete next[k];
      return next;
    });
    if (err) {
      setError(err.message);
      return;
    }
    await loadOverrides();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Цены брендов</h1>
      <p className="text-sm text-slate-500 mb-6">
        Здесь можно вручную задать цену по бренду + топливу. Скрапер при следующем
        запуске возьмёт твоё значение вместо средней по стране от GPP. Для CPS правило{' '}
        <code className="bg-slate-100 px-1 rounded">92 = 95 − 20</code> применяется поверх
        (если 95 переопределён, 92 пересчитается автоматически, либо переопредели вручную).
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
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Бренд</th>
                {FUELS.map((f) => (
                  <th key={f.id} className="px-4 py-3 text-right">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BRANDS.map((b) => (
                <tr key={b.slug} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="font-medium text-slate-900">{b.displayName}</span>
                    </div>
                  </td>
                  {FUELS.map((f) => {
                    const k = key(b.slug, f.id);
                    const existing = overrideMap.get(k);
                    const value = edits[k] ?? (existing ? String(existing.price) : '');
                    const isDirty = edits[k] !== undefined && edits[k] !== (existing ? String(existing.price) : '');
                    const isSaving = saving[k];
                    return (
                      <td key={f.id} className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={value}
                            onChange={(e) =>
                              setEdits((cur) => ({
                                ...cur,
                                [k]: e.target.value.replace(/\D/g, ''),
                              }))
                            }
                            placeholder="—"
                            className="w-20 h-9 px-2 text-right text-sm bg-slate-50 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          {isDirty && (
                            <button
                              onClick={() => save(b.slug, f.id)}
                              disabled={isSaving}
                              className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-md disabled:opacity-50"
                              title="Сохранить"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            </button>
                          )}
                          {!isDirty && existing && (
                            <button
                              onClick={() => remove(b.slug, f.id)}
                              disabled={isSaving}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                              title="Удалить (вернуться к GPP)"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                        {existing && !isDirty && (
                          <p className="text-[10px] text-slate-400 text-right mt-0.5">
                            {new Date(existing.updated_at).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500 mt-6">
        💡 Изменения применятся при следующем запуске scrape-prices (06:00 UTC ежедневно).
        Если хочешь применить сразу — Actions → scrape-prices → Run workflow.
      </p>
    </div>
  );
}
