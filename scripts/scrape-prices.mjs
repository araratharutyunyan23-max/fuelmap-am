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
// Max Oil: prices are written as plain Armenian text on the homepage:
//   "AI-92 Ռեգուլյար 1լ 520 դրամ"
//   "AI-95 Պրեմիում 1լ 550 դրամ"
//   "AI-98 Սուպեր 1լ 680 դրամ"
//   "Դիզելային վառելիք 1լ 590 դրամ"
//   "LPG 280 դրամ"
// We strip HTML tags and grab a digit group right before "դրամ" after each
// fuel name. "Max Drive" premium variants are intentionally ignored — they
// are a different product, not the regular pump price for that octane.
// ---------------------------------------------------------------------------

async function scrapeMaxOil() {
  const html = await fetchText('https://maxoil.am/');
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  const grab = (re) => {
    const m = text.match(re);
    return m ? parseInt(m[1], 10) : null;
  };
  // (?<!Max Drive\s) excludes the premium variants; LPG has no "1լ" prefix.
  const a92    = grab(/(?<!Max Drive\s)AI-92\s+\S+\s+1[լlL]\s*(\d{3})\s*դրամ/);
  const a95    = grab(/(?<!Max Drive\s)AI-95\s+\S+\s+1[լlL]\s*(\d{3})\s*դրամ/);
  const a98    = grab(/(?<!Max Drive\s)AI-98\s+\S+\s+1[լlL]\s*(\d{3})\s*դրամ/);
  const diesel = grab(/Դիզելային\s+վառելիք\s+1[լlL]\s*(\d{3})\s*դրամ/);
  const lpg    = grab(/LPG\s+(\d{3})\s*դրամ/);

  const out = [];
  if (a92    !== null) out.push({ id: '92',     label: '92',     price: a92 });
  if (a95    !== null) out.push({ id: '95',     label: '95',     price: a95 });
  if (a98    !== null) out.push({ id: '98',     label: '98',     price: a98 });
  if (diesel !== null) out.push({ id: 'diesel', label: 'Дизель', price: diesel });
  if (lpg    !== null) out.push({ id: 'lpg',    label: 'LPG',    price: lpg });
  if (out.length === 0) throw new Error('maxoil.am: could not parse any price');
  return out;
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

// supabase-js paginates selects at 1000 rows. We have ~1000+ price rows
// so fetch them in pages.
async function fetchAllPrices() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('station_prices')
      .select('station_id, fuel_type, price')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

const FUEL_LABEL = {
  '92': 'Regular',
  '95': 'Premium',
  '98': 'Super',
  diesel: 'Diesel',
  lpg: 'LPG',
  cng: 'CNG',
};

// Diff incoming rows against existing prices, grouped by (brand, fuel).
// Each group reports a single change event when the old/new pair is
// uniform within the group (the typical case — chains use one price for
// all branches). Mixed groups list affected station counts.
function summarizeChanges(oldByKey, newRows, brandByStation) {
  const groups = new Map();
  for (const r of newRows) {
    const brand = brandByStation.get(r.station_id);
    if (!brand) continue;
    const key = `${r.station_id}|${r.fuel_type}`;
    const oldP = oldByKey.get(key);
    if (oldP === undefined) continue; // new row, skip
    if (oldP === r.price) continue;   // unchanged

    const groupKey = `${brand}|${r.fuel_type}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push({ stationId: r.station_id, oldP, newP: r.price });
  }

  const events = [];
  for (const [groupKey, items] of groups) {
    const [brand, fuel] = groupKey.split('|');
    const fuelLabel = FUEL_LABEL[fuel] ?? fuel;
    const allOld = new Set(items.map((i) => i.oldP));
    const allNew = new Set(items.map((i) => i.newP));
    if (allOld.size === 1 && allNew.size === 1) {
      const oldP = [...allOld][0];
      const newP = [...allNew][0];
      events.push({ brand, fuel, fuelLabel, oldP, newP, count: items.length });
    } else {
      // Mixed: report aggregate
      events.push({
        brand,
        fuel,
        fuelLabel,
        oldP: null,
        newP: null,
        count: items.length,
        mixed: true,
      });
    }
  }
  return events;
}

async function notifyTelegram(events) {
  if (events.length === 0) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId   = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.warn(
      '  Telegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set in env; skipping notification'
    );
    return;
  }

  const lines = ['💲 Цены обновились:', ''];
  for (const e of events) {
    if (e.mixed) {
      lines.push(`• ${e.brand} ${e.fuelLabel}: изменилось у ${e.count} АЗС (разные значения)`);
    } else {
      const diff = e.newP - e.oldP;
      const arrow = diff > 0 ? '↑' : '↓';
      const pct = ((diff / e.oldP) * 100).toFixed(1);
      lines.push(
        `• ${e.brand} ${e.fuelLabel}: ${e.oldP} → ${e.newP} ֏  ${arrow}${Math.abs(diff)} (${pct}%)  · ${e.count} АЗС`
      );
    }
  }

  const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
  });
  if (!r.ok) {
    const txt = await r.text();
    console.warn(`  Telegram: send failed (${r.status}): ${txt.slice(0, 200)}`);
  } else {
    console.log(`  Telegram: posted ${events.length} change events`);
  }
}

async function main() {
  console.log('1/4  Scraping flashpetrol.am ...');
  const flashPrices = await scrapeFlash();
  console.log('  →', flashPrices.map((p) => `${p.label}=${p.price}`).join(', '));

  console.log('2/4  Scraping maxoil.am ...');
  const maxOilPrices = await scrapeMaxOil();
  console.log('  →', maxOilPrices.map((p) => `${p.label}=${p.price}`).join(', '));

  console.log('3/4  Scraping globalpetrolprices.com ...');
  const gppPrices = await scrapeGPPPrices();
  console.log('  →', gppPrices.map((p) => `${p.label}=${p.price}`).join(', '));

  console.log('4/4  Loading station IDs from DB ...');
  const { data: allStations, error: e0 } = await supabase
    .from('stations').select('id, brand');
  if (e0) throw e0;
  const brandByStation = new Map(allStations.map((s) => [s.id, s.brand]));

  const flashIds  = allStations.filter((s) => s.brand === 'Flash').map((s) => s.id);
  const maxOilIds = allStations.filter((s) => s.brand === 'Max Oil').map((s) => s.id);
  const otherIds  = allStations
    .filter((s) => s.brand !== 'Flash' && s.brand !== 'Max Oil')
    .map((s) => s.id);
  console.log(`  Flash: ${flashIds.length} · Max Oil: ${maxOilIds.length} · others: ${otherIds.length}`);

  // Snapshot existing prices BEFORE the upsert so we can detect what
  // changed and post a single summary to Telegram.
  console.log('  Reading existing prices for diff …');
  const oldPrices = await fetchAllPrices();
  const oldByKey = new Map(oldPrices.map((p) => [`${p.station_id}|${p.fuel_type}`, p.price]));

  const flashRows  = buildUpsertRows(flashIds,  flashPrices);
  const maxOilRows = buildUpsertRows(maxOilIds, maxOilPrices);
  const otherRows  = buildUpsertRows(otherIds,  gppPrices);
  const allRows = [...flashRows, ...maxOilRows, ...otherRows];

  console.log(`Upserting ${allRows.length} price rows ...`);
  await upsertChunks(allRows);

  // Diff old vs new and notify Telegram (silent if nothing changed).
  const events = summarizeChanges(oldByKey, allRows, brandByStation);
  if (events.length === 0) {
    console.log('No price changes — Telegram silent.');
  } else {
    console.log(`${events.length} brand-fuel change events detected, notifying Telegram…`);
    await notifyTelegram(events);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
