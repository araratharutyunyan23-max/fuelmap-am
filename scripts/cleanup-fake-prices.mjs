// One-off: delete price rows that came from the seed's random generator
// and were never overwritten by a real source.
//
// Real sources:
//   Flash brand   — 92, 95, 98, diesel, lpg (from flashpetrol.am)
//   non-Flash     — 95, diesel, lpg (from globalpetrolprices.com)
//
// Everything else (non-Flash 92/98, ALL CNG) is random seed noise.
//
// Run: node --env-file=.env.local scripts/cleanup-fake-prices.mjs

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function summary(label) {
  const { count } = await sb.from('station_prices').select('*', { count: 'exact', head: true });
  console.log(`${label}: ${count} price rows`);
}

await summary('Before');

// 1. CNG for everyone (no public source).
{
  const { error, count } = await sb
    .from('station_prices')
    .delete({ count: 'exact' })
    .eq('fuel_type', 'cng');
  if (error) throw error;
  console.log(`  Deleted ${count} CNG rows`);
}

// 2. 92 + 98 for non-Flash brands (we only have GPP averages for 95/diesel/LPG).
{
  const { data: flashIds } = await sb.from('stations').select('id').eq('brand', 'Flash');
  const flashSet = new Set(flashIds.map((s) => s.id));

  const { data: rows } = await sb
    .from('station_prices')
    .select('station_id, fuel_type')
    .in('fuel_type', ['92', '98']);

  const toDelete = rows.filter((r) => !flashSet.has(r.station_id));
  if (!toDelete.length) {
    console.log('  No non-Flash 92/98 rows to delete');
  } else {
    // Delete in chunks; PostgREST has a row-id key so we go by composite.
    const CHUNK = 200;
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += CHUNK) {
      const slice = toDelete.slice(i, i + CHUNK);
      const ids = slice.map((r) => r.station_id);
      // Build a per-fuel filter so we don't accidentally hit Flash too.
      for (const fuel of ['92', '98']) {
        const idsForFuel = slice.filter((r) => r.fuel_type === fuel).map((r) => r.station_id);
        if (!idsForFuel.length) continue;
        const { error, count } = await sb
          .from('station_prices')
          .delete({ count: 'exact' })
          .eq('fuel_type', fuel)
          .in('station_id', idsForFuel);
        if (error) throw error;
        deleted += count ?? 0;
      }
    }
    console.log(`  Deleted ${deleted} non-Flash 92/98 rows`);
  }
}

await summary('After');
