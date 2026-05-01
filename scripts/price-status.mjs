// Quick read-only summary of current price coverage in the DB.
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const FUEL_ORDER = ['92', '95', '98', 'diesel', 'lpg', 'cng'];

const { data: stations } = await sb.from('stations').select('id, brand');
const stationById = Object.fromEntries(stations.map((s) => [s.id, s.brand]));
const stationCountByBrand = stations.reduce((m, s) => (m[s.brand] = (m[s.brand] || 0) + 1, m), {});

// supabase-js caps a single select at 1000 rows by default — paginate.
async function fetchAllPrices() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await sb
      .from('station_prices')
      .select('station_id, fuel_type, price, updated_at')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}
const prices = await fetchAllPrices();

// Group: brand × fuel → array of prices
const grouped = {};
for (const p of prices) {
  const brand = stationById[p.station_id];
  if (!brand) continue;
  grouped[brand] = grouped[brand] || {};
  grouped[brand][p.fuel_type] = grouped[brand][p.fuel_type] || [];
  grouped[brand][p.fuel_type].push({ price: p.price, updated: new Date(p.updated_at) });
}

const brands = Object.keys(grouped).sort((a, b) => stationCountByBrand[b] - stationCountByBrand[a]);

console.log(`\nTotal: ${stations.length} stations, ${prices.length} price rows`);
console.log();

const fuelHeader = FUEL_ORDER.map((f) => f.padStart(7)).join(' │');
console.log('brand'.padEnd(13), '│ st │', fuelHeader, '│  freshest update');
console.log('─'.repeat(13 + 5 + FUEL_ORDER.length * 9 + 22));

for (const b of brands) {
  const cells = FUEL_ORDER.map((f) => {
    const arr = grouped[b][f];
    if (!arr || !arr.length) return '   —   ';
    const min = Math.min(...arr.map((x) => x.price));
    const max = Math.max(...arr.map((x) => x.price));
    return min === max ? `${min}`.padStart(7) : `${min}-${max}`.padStart(7);
  }).join(' │');
  const freshest = Object.values(grouped[b])
    .flat()
    .reduce((acc, x) => (x.updated > acc ? x.updated : acc), new Date(0));
  const ago = Math.round((Date.now() - freshest.getTime()) / 3600000);
  console.log(b.padEnd(13), '│', String(stationCountByBrand[b]).padStart(2), '│', cells, '│', `${ago}h ago`);
}

console.log();
console.log('Legend: range like "470-490" = per-station seed values still in place.');
console.log('Single value (e.g. "550") = same value across all stations of that brand.');
