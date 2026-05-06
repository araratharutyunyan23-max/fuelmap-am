// Daily Instagram autopost — fires from Vercel Cron at 11:00 Yerevan
// (07:00 UTC), one hour after the price scraper finishes.
//
// Flow:
//   1. Pull cheapest 92 / 95 / diesel from station_prices (one row each)
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

const FUELS = ['92', '95', 'diesel'] as const;
const FUEL_LABEL: Record<string, string> = {
  '92': '92',
  '95': '95',
  diesel: 'DSL',
};
const FUEL_ARM: Record<string, string> = {
  '92': 'Ռեգուլյար (92)',
  '95': 'Պրեմիում (95)',
  diesel: 'Դիզել',
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
  // 1080×1080, emerald background (#059669), white text. Keep markup
  // dependency-free so any default sharp font can render it; numbers
  // and Latin labels only in the image — Armenian text lives in the
  // post caption.
  const lines = rows
    .map((r, i) => {
      const y = 480 + i * 140;
      return `
        <text x="80"  y="${y}" font-size="56" font-weight="700" fill="#ffffff">${FUEL_LABEL[r.fuel]}</text>
        <text x="540" y="${y}" font-size="56" font-weight="700" fill="#fbbf24" text-anchor="end">${r.price} ֏</text>
        <text x="600" y="${y}" font-size="40" font-weight="500" fill="#d1fae5">${r.brand}</text>
      `;
    })
    .join('');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="#059669"/>
  <text x="80" y="180" font-family="Arial,sans-serif" font-size="72" font-weight="800" fill="#ffffff">FuelMap</text>
  <text x="380" y="180" font-family="Arial,sans-serif" font-size="72" font-weight="800" fill="#fbbf24">Armenia</text>
  <text x="80" y="240" font-family="Arial,sans-serif" font-size="32" font-weight="500" fill="#d1fae5">CHEAPEST TODAY</text>
  <line x1="80" y1="360" x2="1000" y2="360" stroke="#10b981" stroke-width="2"/>
  <g font-family="Arial,sans-serif">
    ${lines}
  </g>
  <text x="80" y="980" font-family="Arial,sans-serif" font-size="40" font-weight="600" fill="#ffffff">fuelmap.app</text>
  <text x="1000" y="980" font-family="Arial,sans-serif" font-size="32" font-weight="500" fill="#d1fae5" text-anchor="end">@fuelmap_armenia</text>
</svg>
`;
}

function buildCaption(rows: CheapestRow[]): string {
  const lines = rows.map(
    (r) => `⛽ ${FUEL_ARM[r.fuel]} — ${r.price} ֏ · ${r.brand}`
  );
  return [
    '☀️ Բարի լույս! Այսօրվա ամենացածր գները Հայաստանում:',
    '',
    ...lines,
    '',
    'Բոլոր ԲԿ-ները քարտեզի վրա ⬇️',
    'fuelmap.app',
    '',
    '#fuelmap #fuelmaparmenia #բենզին #երևան #հայաստան #yerevan #armenia',
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
