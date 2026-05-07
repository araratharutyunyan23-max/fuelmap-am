// Daily Instagram autopost — fires from Vercel Cron at 11:00 Yerevan
// (07:00 UTC), one hour after the price scraper finishes.
//
// Flow:
//   1. Pull cheapest Regular(92) / Premium(95) / LPG from station_prices
//   2. Render a 1080×1080 JPEG with those numbers via sharp + SVG
//   3. Upload to Supabase Storage public bucket so IG can fetch it
//   4. POST to IG Graph: /me/media (container) → /me/media_publish (publish)
//
// Auth: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Same
// pattern as the scrape-prices route.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Embed Noto Sans Armenian directly in the SVG via @font-face base64.
// Vercel's serverless Linux image has DejaVu / Liberation but NO
// Armenian glyph coverage — without bundling the font, all our
// "ԱՅՍՕՐ" / "Բարի լույս" text rendered as boxes (□□□□) on the
// generated image. The bundled .ttf files come from Google Fonts
// Noto family, ~48 KB each — small enough to inline at every request
// without measurable latency.
const FONT_DIR = join(process.cwd(), 'fonts');
const FONT_REGULAR_B64 = readFileSync(join(FONT_DIR, 'NotoSansArmenian-Regular.ttf')).toString('base64');
const FONT_BOLD_B64    = readFileSync(join(FONT_DIR, 'NotoSansArmenian-Bold.ttf')).toString('base64');
const FONT_FACE_CSS = `
@font-face { font-family: 'NSArm'; font-weight: 400; src: url(data:font/ttf;base64,${FONT_REGULAR_B64}) format('truetype'); }
@font-face { font-family: 'NSArm'; font-weight: 700; src: url(data:font/ttf;base64,${FONT_BOLD_B64})    format('truetype'); }
`;

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

// Brand-comparison post: 4 brands × 4 fuels (Regular / Premium / LPG /
// Diesel). Bigger picture vs a "cheapest 3" list — readers can spot
// their preferred brand and decide where to fill up.
const BRANDS = ['Flash Petrol', 'Max Oil', 'CPS', 'Flash'] as const;
const FUELS = ['92', '95', 'lpg', 'diesel'] as const;
const FUEL_HEAD: Record<string, string> = {
  '92': 'Regular',
  '95': 'Premium',
  lpg: 'LPG',
  diesel: 'Diesel',
};
const FUEL_ARM_SHORT: Record<string, string> = {
  '92': 'Regular',
  '95': 'Premium',
  lpg: 'գազ',
  diesel: 'դիզել',
};

// Armenian month names — nominative for image (less inflected, reads
// like a header), genitive for the caption sentence.
const ARM_MONTHS_NOM = ['Հունվար','Փետրվար','Մարտ','Ապրիլ','Մայիս','Հունիս','Հուլիս','Օգոստոս','Սեպտեմբեր','Հոկտեմբեր','Նոյեմբեր','Դեկտեմբեր'];
const ARM_MONTHS_GEN = ['Հունվարի','Փետրվարի','Մարտի','Ապրիլի','Մայիսի','Հունիսի','Հուլիսի','Օգոստոսի','Սեպտեմբերի','Հոկտեմբերի','Նոյեմբերի','Դեկտեմբերի'];

function yerevanDate(): { day: number; month: number; year: number } {
  const s = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const [m, d, y] = s.split('/').map(Number);
  return { day: d, month: m - 1, year: y };
}

type BrandTable = Record<string, Record<string, number | undefined>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchBrandTable(supabase: any): Promise<BrandTable> {
  const out: BrandTable = {};
  for (const brand of BRANDS) {
    out[brand] = {};
    for (const fuel of FUELS) {
      // Fetch cheapest price for this brand+fuel. brand_price_overrides
      // make all stations of a brand quote the same number, but we
      // still query in case some stations diverge.
      const { data, error } = await supabase
        .from('station_prices')
        .select('price, stations:station_id!inner(brand)')
        .eq('fuel_type', fuel)
        .gt('price', 0)
        .order('price', { ascending: true });
      if (error) throw new Error(`fetchBrandTable ${brand}/${fuel}: ${error.message}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matching = (data ?? []).filter((r: any) => r.stations?.brand === brand);
      if (matching.length > 0) out[brand][fuel] = matching[0].price as number;
    }
  }
  return out;
}

function renderSvg(table: BrandTable, dateUpper: string): string {
  // 1080×1080, dark navy gradient + emerald accents. Layout: 4-brand
  // table with Regular/Premium/LPG/Diesel columns. Bundled Noto Sans
  // Armenian renders the headline + sub-line correctly on Vercel's
  // serverless Linux (no Armenian glyphs in the default font set).
  const FONT = 'NSArm, Arial, sans-serif';
  const COLS_X = [120, 530, 720, 880, 1020]; // brand, regular, premium, lpg, diesel
  const ROW_H = 110;
  const TABLE_TOP = 410;

  let svgRows = `
    <text x="${COLS_X[0]}" y="${TABLE_TOP}" font-family='${FONT}' font-size="28" font-weight="700" fill="#94a3b8">ԲՐԵՆԴ</text>
    <text x="${COLS_X[1]}" y="${TABLE_TOP}" font-family='${FONT}' font-size="28" font-weight="700" fill="#94a3b8" text-anchor="end">${FUEL_HEAD['92']}</text>
    <text x="${COLS_X[2]}" y="${TABLE_TOP}" font-family='${FONT}' font-size="28" font-weight="700" fill="#94a3b8" text-anchor="end">${FUEL_HEAD['95']}</text>
    <text x="${COLS_X[3]}" y="${TABLE_TOP}" font-family='${FONT}' font-size="28" font-weight="700" fill="#94a3b8" text-anchor="end">${FUEL_HEAD['lpg']}</text>
    <text x="${COLS_X[4]}" y="${TABLE_TOP}" font-family='${FONT}' font-size="28" font-weight="700" fill="#94a3b8" text-anchor="end">${FUEL_HEAD['diesel']}</text>
  `;

  for (let i = 0; i < BRANDS.length; i++) {
    const brand = BRANDS[i];
    const y = TABLE_TOP + 70 + i * ROW_H;
    svgRows += `
      <line x1="80" y1="${y - 50}" x2="1000" y2="${y - 50}" stroke="#1e293b" stroke-width="1"/>
      <text x="${COLS_X[0]}" y="${y}" font-family='${FONT}' font-size="38" font-weight="700" fill="#ffffff">${brand}</text>
    `;
    for (let j = 0; j < FUELS.length; j++) {
      const v = table[brand]?.[FUELS[j]];
      const fill = v ? '#10b981' : '#475569';
      const txt = v ?? '—';
      svgRows += `<text x="${COLS_X[j + 1]}" y="${y}" font-family='${FONT}' font-size="46" font-weight="800" fill="${fill}" text-anchor="end">${txt}</text>`;
    }
  }

  const tgIcon = `
    <g transform="translate(80,990)">
      <circle cx="22" cy="22" r="22" fill="#229ED9"/>
      <path d="M9.5 22.2 l28-12.5 c1.4-.6 2.6.4 2.2 2.1 l-4.4 20.7 c-.3 1.3-1.1 1.6-2.2 1 l-6-4.4 -2.9 2.8 c-.3.3-.6.6-1.2.6 l.4-6.1 11.2-10.1 c.5-.4-.1-.6-.7-.3 L20 22.5 13.7 20.6 c-1.4-.4-1.4-1.4.3-2 z" fill="#fff"/>
    </g>`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <style>${FONT_FACE_CSS}</style>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#34d399"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect x="0" y="0" width="1080" height="8" fill="url(#accent)"/>

  <text x="80" y="170" font-family='${FONT}' font-size="80" font-weight="900" fill="#ffffff">FuelMap <tspan fill="#10b981">Armenia</tspan></text>
  <text x="80" y="225" font-family='${FONT}' font-size="32" font-weight="600" fill="#94a3b8">${dateUpper} · ՎԱՌԵԼԻՔԻ ԳՆԵՐԸ ՀԱՅԱՍՏԱՆՈՒՄ</text>
  <text x="80" y="270" font-family='${FONT}' font-size="26" font-weight="500" fill="#64748b">գները՝ դրամ/լիտր</text>

  ${svgRows}

  <line x1="80" y1="900" x2="1000" y2="900" stroke="#334155" stroke-width="2"/>
  <text x="80" y="970" font-family='${FONT}' font-size="38" font-weight="700" fill="#10b981">🌐 fuelmap.app</text>
  ${tgIcon}
  <text x="145" y="1023" font-family='${FONT}' font-size="32" font-weight="500" fill="#cbd5e1">Telegram: <tspan fill="#ffffff" font-weight="700">@fuelmaparmeniachat</tspan></text>
</svg>
`;
}

function buildCaption(table: BrandTable, dateGenitive: string): string {
  const lines = BRANDS.map((brand) => {
    const parts = FUELS.map((fuel) => {
      const v = table[brand]?.[fuel];
      if (!v) return null;
      return `${FUEL_ARM_SHORT[fuel]} ${v}`;
    }).filter(Boolean);
    if (parts.length === 0) return null;
    return `⛽ ${brand} — ${parts.join(' · ')} ֏`;
  }).filter(Boolean) as string[];

  return [
    `📊 Այսօրվա վառելիքի գները Հայաստանում — ${dateGenitive}`,
    '',
    ...lines,
    '',
    '🗺 Բոլոր ԲԿ-ները քարտեզի վրա — fuelmap.app',
    '✈️ Telegram: @fuelmaparmeniachat',
    '',
    '#fuelmap #fuelmaparmenia #բենզին #գազ #երևան #հայաստան #yerevan #armenia',
  ].join('\n');
}

async function uploadToStorage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  buf: Buffer
): Promise<string> {
  const path = `instagram-daily/${new Date().toISOString().slice(0, 10)}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('price-photos')
    .upload(path, buf, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`upload: ${error.message}`);
  const { data } = supabase.storage.from('price-photos').getPublicUrl(path);
  return data.publicUrl;
}

async function publishToInstagram(imageUrl: string, caption: string) {
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID!;
  const token = process.env.META_PAGE_ACCESS_TOKEN!;

  // Step 1: create container
  const containerRes = await fetch(
    `https://graph.facebook.com/v23.0/${igId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        image_url: imageUrl,
        caption,
        access_token: token,
      }),
    }
  );
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error(`media create: ${JSON.stringify(containerData)}`);
  }

  // Step 2: publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v23.0/${igId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: containerData.id,
        access_token: token,
      }),
    }
  );
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error(`media publish: ${JSON.stringify(publishData)}`);
  }
  return publishData.id as string;
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase env');
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const table = await fetchBrandTable(supabase);
    const rowCount = BRANDS.reduce(
      (n, b) => n + Object.keys(table[b] ?? {}).length,
      0
    );
    if (rowCount === 0) {
      return NextResponse.json({ ok: false, reason: 'no prices in db' }, { status: 200 });
    }

    const { day, month } = yerevanDate();
    const dateUpper = `${day} ${ARM_MONTHS_NOM[month].toUpperCase()}`;
    const dateGenitive = `${day} ${ARM_MONTHS_GEN[month]}`;

    const svg = renderSvg(table, dateUpper);
    const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
    const imageUrl = await uploadToStorage(supabase, jpeg);
    const postId = await publishToInstagram(imageUrl, buildCaption(table, dateGenitive));

    return NextResponse.json({
      ok: true,
      postId,
      imageUrl,
      cellsPosted: rowCount,
    });
  } catch (err) {
    console.error('[cron/instagram-daily]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
