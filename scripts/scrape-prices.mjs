// Updates station_prices from public sources.
//
// Sources, in order of priority for a given station:
//   1. flashpetrol.am — Flash brand stations only (per-brand prices for 92/95/98/diesel/LPG).
//   2. globalpetrolprices.com — country-wide weekly averages (95/diesel/LPG) applied to
//      every non-Flash station.
//
// Two ways to invoke:
//   - locally: node --env-file=.env.local scripts/scrape-prices.mjs
//   - from the Vercel cron route: import { runScraper } from '...'; runScraper(env)
//
// 92, 98 and CNG for non-Flash brands are left alone — we have no honest source.

import { createClient } from '@supabase/supabase-js';

// Initialised inside runScraper() so importing this module doesn't fire
// process.exit on missing env, and the Vercel route can pass its own
// env values explicitly.
let supabase = null;

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
// Per-brand derived prices.
//
// Reserved for future fuel-derivation rules expressed as a function of
// scraped 95. Empty for now — the admin's brand_price_overrides table
// is the explicit source of truth. Removed the CPS "92 = 95 − 20"
// auto-rule on 2026-05-05 because it was misleading: real CPS pumps
// drift, and the admin would rather set both numbers explicitly.
// ---------------------------------------------------------------------------

const BRAND_PRICE_RULES = {};

// Read all brand_price_overrides once at the start of a run. Returns
// Map<brand, Map<fuel_type, price>> so deriveBrandPrices can override
// individual fuels per brand without changing the rest of the pipeline.
async function fetchOverrides() {
  const { data, error } = await supabase
    .from('brand_price_overrides')
    .select('brand, fuel_type, price');
  if (error) {
    console.warn('  brand_price_overrides fetch failed (using GPP only):', error.message);
    return new Map();
  }
  const map = new Map();
  for (const row of data ?? []) {
    if (!map.has(row.brand)) map.set(row.brand, new Map());
    map.get(row.brand).set(row.fuel_type, row.price);
  }
  return map;
}

const FUEL_LABEL_RU = {
  '92': '92',
  '95': '95',
  '98': '98',
  diesel: 'Дизель',
  lpg: 'LPG',
  cng: 'CNG',
};

function deriveBrandPrices(brand, gppPrices, overrideMap) {
  // Overrides win across the board: if the admin set CPS/95 = 520, we
  // ignore GPP for that pair AND any derived rule that pegged a price
  // to the GPP value gets recomputed from the overridden 95.
  const overrides = overrideMap.get(brand);
  let prices = gppPrices.map((p) => {
    if (overrides?.has(p.id)) {
      return { ...p, price: overrides.get(p.id) };
    }
    return p;
  });
  // Add any override fuel that GPP doesn't have at all (e.g. CPS 92, Gulf 92).
  if (overrides) {
    for (const [fuelId, price] of overrides) {
      if (!prices.some((p) => p.id === fuelId)) {
        prices.push({ id: fuelId, label: FUEL_LABEL_RU[fuelId] ?? fuelId, price });
      }
    }
  }
  // Apply derived rules using the (possibly overridden) 95.
  const rules = BRAND_PRICE_RULES[brand];
  if (!rules) return prices;
  const p95 = prices.find((p) => p.id === '95')?.price;
  if (p95 == null) return prices;
  for (const [fuelId, fn] of Object.entries(rules)) {
    // Don't double-write: if an override exists for this derived fuel,
    // the admin's number wins.
    if (overrides?.has(fuelId)) continue;
    const derived = fn(p95);
    // Replace existing entry of the same fuel id, or append.
    const idx = prices.findIndex((p) => p.id === fuelId);
    if (idx >= 0) prices[idx] = derived;
    else prices.push(derived);
  }
  return prices;
}

// `trend` is the delta vs the previous DIFFERENT price — we want
// "↓ 5 ֏" to stay visible until the next change, not reset to 0 the
// next morning. So:
//   * new station / first scrape → trend = 0
//   * price unchanged             → keep the previous trend
//   * price changed               → trend = newPrice - oldPrice
function buildUpsertRows(stationIds, prices, oldByKey) {
  const now = new Date().toISOString();
  return stationIds.flatMap((stationId) =>
    prices.map((p) => {
      const old = oldByKey.get(`${stationId}|${p.id}`);
      let trend = 0;
      if (old) {
        trend = p.price === old.price ? (old.trend ?? 0) : p.price - old.price;
      }
      return {
        station_id: stationId,
        fuel_type: p.id,
        label: p.label,
        price: p.price,
        trend,
        updated_at: now,
      };
    })
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
      .select('station_id, fuel_type, price, trend')
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
    const old = oldByKey.get(key);
    if (old === undefined) continue;     // new row, skip
    if (old.price === r.price) continue; // unchanged

    const groupKey = `${brand}|${r.fuel_type}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push({ stationId: r.station_id, oldP: old.price, newP: r.price });
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

export async function runScraper() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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
  // Group remaining stations by brand so we can apply per-brand derived
  // prices (see BRAND_PRICE_RULES above).
  const otherIdsByBrand = new Map();
  for (const s of allStations) {
    if (s.brand === 'Flash' || s.brand === 'Max Oil') continue;
    if (!otherIdsByBrand.has(s.brand)) otherIdsByBrand.set(s.brand, []);
    otherIdsByBrand.get(s.brand).push(s.id);
  }
  const otherTotal = [...otherIdsByBrand.values()].reduce((a, ids) => a + ids.length, 0);
  console.log(`  Flash: ${flashIds.length} · Max Oil: ${maxOilIds.length} · others: ${otherTotal} (${otherIdsByBrand.size} brands)`);

  console.log('  Reading admin overrides …');
  const overrideMap = await fetchOverrides();
  if (overrideMap.size > 0) {
    for (const [brand, fuels] of overrideMap) {
      console.log(`    ${brand}: ${[...fuels.entries()].map(([k,v]) => `${k}=${v}`).join(', ')}`);
    }
  }

  // Snapshot existing prices BEFORE the upsert so we can detect what
  // changed and post a single summary to Telegram.
  console.log('  Reading existing prices for diff …');
  const oldPrices = await fetchAllPrices();
  const oldByKey = new Map(
    oldPrices.map((p) => [`${p.station_id}|${p.fuel_type}`, { price: p.price, trend: p.trend }])
  );

  const flashRows  = buildUpsertRows(flashIds,  flashPrices,  oldByKey);
  const maxOilRows = buildUpsertRows(maxOilIds, maxOilPrices, oldByKey);
  const otherRows = [];
  for (const [brand, ids] of otherIdsByBrand) {
    const brandPrices = deriveBrandPrices(brand, gppPrices, overrideMap);
    otherRows.push(...buildUpsertRows(ids, brandPrices, oldByKey));
  }
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

// Auto-run only when invoked directly via `node scripts/scrape-prices.mjs`.
// Importing this module from the Vercel cron route does NOT trigger main().
const isMainCli =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('scrape-prices.mjs');
if (isMainCli) {
  runScraper().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
