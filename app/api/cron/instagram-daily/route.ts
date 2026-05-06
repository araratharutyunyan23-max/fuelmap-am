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

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const FUELS = ['92', '95', 'lpg'] as const;
const FUEL_LABEL: Record<string, string> = {
  '92': 'Regular',
  '95': 'Premium',
  lpg: 'LPG',
};
const FUEL_ARM: Record<string, string> = {
  '92': 'Ռեգուլյար (92)',
  '95': 'Պրեմիում (95)',
  lpg: 'Գազ (LPG)',
};

interface CheapestRow {
  fuel: string;
  price: number;
  stationName: string;
  brand: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchCheapest(supabase: any): Promise<CheapestRow[]> {
  const out: CheapestRow[] = [];
  for (const fuel of FUELS) {
    const { data, error } = await supabase
      .from('station_prices')
      .select('price, stations:station_id(name, brand)')
      .eq('fuel_type', fuel)
      .gt('price', 0)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`fetchCheapest ${fuel}: ${error.message}`);
    if (!data) continue;
    const station = data.stations;
    out.push({
      fuel,
      price: data.price as number,
      stationName: station?.name ?? '?',
      brand: station?.brand ?? '?',
    });
  }
  return out;
}

function renderSvg(rows: CheapestRow[]): string {
  // 1080×1080, dark navy gradient bg, emerald accents. Armenian
  // subtitle uses fontconfig fallback (DejaVu Sans / Sylfaen / Noto
  // Sans Armenian) — all of these have Armenian glyph coverage on
  // Linux. Footer links to website + Telegram.
  const FONT = '"Noto Sans Armenian","DejaVu Sans","Sylfaen",Arial,sans-serif';

  const lines = rows
    .map((r, i) => {
      const y = 490 + i * 130;
      return `
        <text x="80"  y="${y}" font-family='${FONT}' font-size="48" font-weight="700" fill="#94a3b8">${FUEL_LABEL[r.fuel]}</text>
        <text x="640" y="${y}" font-family='${FONT}' font-size="76" font-weight="900" fill="#10b981" text-anchor="end">${r.price} ֏</text>
        <text x="700" y="${y}" font-family='${FONT}' font-size="42" font-weight="600" fill="#cbd5e1">${r.brand}</text>
      `;
    })
    .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
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

  <text x="80" y="180" font-family='${FONT}' font-size="80" font-weight="900" fill="#ffffff">FuelMap <tspan fill="#10b981">Armenia</tspan></text>
  <text x="80" y="240" font-family='${FONT}' font-size="34" font-weight="600" fill="#94a3b8">ԱՅՍՕՐՎԱ ԱՄԵՆԱԷԺԱՆ ԳՆԵՐԸ</text>

  <line x1="80" y1="370" x2="1000" y2="370" stroke="#334155" stroke-width="2"/>
  ${lines}
  <line x1="80" y1="900" x2="1000" y2="900" stroke="#334155" stroke-width="2"/>

  <text x="80" y="970"  font-family='${FONT}' font-size="38" font-weight="700" fill="#10b981">🌐 fuelmap.app</text>
  <text x="80" y="1025" font-family='${FONT}' font-size="32" font-weight="500" fill="#94a3b8">💬 t.me/fuelmap_armenia</text>
</svg>
`;
}

function buildCaption(rows: CheapestRow[]): string {
  const lines = rows.map(
    (r) => `⛽ ${FUEL_ARM[r.fuel]} — ${r.price} ֏ · ${r.brand}`
  );
  return [
    '☀️ Բարի լույս! Այսօրվա ամենաէժան գները Հայաստանում:',
    '',
    ...lines,
    '',
    '🗺 Բոլոր ԲԿ-ները քարտեզի վրա — fuelmap.app',
    '💬 Քննարկում՝ t.me/fuelmaparmeniachat',
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

    const rows = await fetchCheapest(supabase);
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, reason: 'no prices in db' }, { status: 200 });
    }

    const svg = renderSvg(rows);
    const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
    const imageUrl = await uploadToStorage(supabase, jpeg);
    const postId = await publishToInstagram(imageUrl, buildCaption(rows));

    return NextResponse.json({
      ok: true,
      postId,
      imageUrl,
      rowsPosted: rows.length,
    });
  } catch (err) {
    console.error('[cron/instagram-daily]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
