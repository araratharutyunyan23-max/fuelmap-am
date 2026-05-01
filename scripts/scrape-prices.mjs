// Updates station_prices from public sources.
//
// Sources, in order of priority for a given station:
//   1. flashpetrol.am — Flash brand stations only (per-brand prices for 92/95/98/diesel/LPG).
//   2. globalpetrolprices.com — country-wide weekly averages (95/diesel/LPG) applied to
//      every non-Flash station.
//
// Run: node --env-file=.env.local scripts/scrape-prices.mjs
//
// 92, 98 and CNG for non-Flash brands are left alone — we have no honest source.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/scrape-prices.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';

async function fetchText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*' } });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.text();
}

// ---------------------------------------------------------------------------
// Flash: parse the SSR'd inline JSON.
//
// HTML contains, escaped:
//   "fuelPrices":[{"product_id":2,"product_name":"Պրեմիում","price":540}, ...]
//
// product_name → fuel_type mapping (Armenian):
//   Ռեգուլյար  → 92  (Regular)
//   Պրեմիում   → 95  (Premium)
//   Սուպեր     → 98  (Super)
//   Պրոպան     → lpg
//   Դիզել Ա    → diesel
// ---------------------------------------------------------------------------

const FLASH_NAME_MAP = {
  'Ռեգուլյար': { id: '92', label: '92' },
  'Պրեմիում':  { id: '95', label: '95' },
  'Սուպեր':    { id: '98', label: '98' },
  'Պրոպան':    { id: 'lpg', label: 'LPG' },
  'Դիզել Ա':   { id: 'diesel', label: 'Дизель' },
};

async function scrapeFlash() {
  const html = await fetchText('https://flashpetrol.am/');
  // The JSON is double-string-escaped, so quotes appear as \"
  const m = html.match(/\\"fuelPrices\\":(\[[^\]]+\])/);
  if (!m) throw new Error('flashpetrol.am: could not locate fuelPrices in HTML');
  const json = m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  const items = JSON.parse(json);

  const prices = [];
  for (const it of items) {
    const fuel = FLASH_NAME_MAP[it.product_name];
    if (!fuel) {
      console.warn(`  Flash: unknown product_name "${it.product_name}" → skipping`);
      continue;
    }
    prices.push({ ...fuel, price: it.price });
  }
  return prices;
}

// ---------------------------------------------------------------------------
// GlobalPetrolPrices: each per-country page has a body line like
//   "Armenia: The price of <fuel> is <NNN> Armenian Dram per liter."
// ---------------------------------------------------------------------------

async function scrapeGPP(slug) {
  const html = await fetchText(`https://www.globalpetrolprices.com/Armenia/${slug}/`);
  const m = html.match(/Armenia:[^.]*?(\d+(?:\.\d+)?)\s+Armenian Dram per (?:liter|litre)/);
  if (!m) throw new Error(`GPP ${slug}: could not parse price`);
  return Math.round(parseFloat(m[1]));
}

async function scrapeGPPPrices() {
  const [g95, diesel, lpg] = await Promise.all([
    scrapeGPP('gasoline_prices'),
    scrapeGPP('diesel_prices'),
    scrapeGPP('lpg_prices'),
  ]);
  return [
    { id: '95',     label: '95',     price: g95 },
    { id: 'diesel', label: 'Дизель', price: diesel },
    { id: 'lpg',    label: 'LPG',    price: lpg },
  ];
}

// ---------------------------------------------------------------------------

function buildUpsertRows(stationIds, prices) {
  const now = new Date().toISOString();
  return stationIds.flatMap((stationId) =>
    prices.map((p) => ({
      station_id: stationId,
      fuel_type: p.id,
      label: p.label,
      price: p.price,
      trend: 0,
      updated_at: now,
    }))
  );
}

async function upsertChunks(rows, chunkSize = 500) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('station_prices')
      .upsert(chunk, { onConflict: 'station_id,fuel_type' });
    if (error) {
      console.error('  upsert error:', error.message);
      process.exit(1);
    }
    process.stdout.write(`\r  upserted ${i + chunk.length}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  console.log('1/3  Scraping flashpetrol.am ...');
  const flashPrices = await scrapeFlash();
  console.log('  →', flashPrices.map((p) => `${p.label}=${p.price}`).join(', '));

  console.log('2/3  Scraping globalpetrolprices.com ...');
  const gppPrices = await scrapeGPPPrices();
  console.log('  →', gppPrices.map((p) => `${p.label}=${p.price}`).join(', '));

  console.log('3/3  Loading station IDs from DB ...');
  const { data: flashStations, error: e1 } = await supabase
    .from('stations').select('id').eq('brand', 'Flash');
  if (e1) throw e1;
  const { data: otherStations, error: e2 } = await supabase
    .from('stations').select('id').neq('brand', 'Flash');
  if (e2) throw e2;
  console.log(`  Flash: ${flashStations.length} stations · others: ${otherStations.length} stations`);

  const flashRows = buildUpsertRows(flashStations.map((s) => s.id), flashPrices);
  const otherRows = buildUpsertRows(otherStations.map((s) => s.id), gppPrices);
  const allRows = [...flashRows, ...otherRows];

  console.log(`Upserting ${allRows.length} price rows ...`);
  await upsertChunks(allRows);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
