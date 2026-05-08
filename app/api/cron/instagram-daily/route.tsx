// Daily Instagram autopost — fires from Vercel Cron at 11:00 Yerevan
// (07:00 UTC), one hour after the price scraper finishes.
//
// Renders the brand-comparison image via next/og (Satori) instead of
// raw SVG → sharp. Sharp's resvg backend on Vercel silently ignores
// @font-face data URIs, so our bundled Noto Sans Armenian never
// reached the renderer and Armenian glyphs came out as tofu boxes.
// next/og loads custom fonts via its `fonts` option and reliably
// renders Armenian + Latin together.
//
// After the feed post succeeds, this route also triggers the Story
// route internally. We fold both into a single Vercel-cron entry
// because Hobby plan caps cron jobs at 2 per project — exceeding that
// silently disables the scheduler for ALL crons, not just the extra.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Bumped from 120s — this route now also chains into the Story route,
// so worst-case is two IG container polls back-to-back (~30-50s each).
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// Read the bundled Armenian fonts once per cold start. The /fonts
// directory is included in the function bundle via
// outputFileTracingIncludes in next.config.mjs.
const FONT_DIR = join(process.cwd(), 'fonts');
const FONT_REGULAR: ArrayBuffer = readFileSync(join(FONT_DIR, 'NotoSansArmenian-Regular.ttf')).buffer.slice(0) as ArrayBuffer;
const FONT_BOLD: ArrayBuffer = readFileSync(join(FONT_DIR, 'NotoSansArmenian-Bold.ttf')).buffer.slice(0) as ArrayBuffer;

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

const ARM_MONTHS_NOM = ['Հունվար','Փետրվար','Մարտ','Ապրիլ','Մայիս','Հունիս','Հուլիս','Օգոստոս','Սեպտեմբեր','Հոկտեմբեր','Նոյեմբեր','Դեկտեմբեր'];
const ARM_MONTHS_GEN = ['Հունվարի','Փետրվարի','Մարտի','Ապրիլի','Մայիսի','Հունիսի','Հուլիսի','Օգոստոսի','Սեպտեմբերի','Հոկտեմբերի','Նոյեմբերի','Դեկտեմբերի'];

function yerevanDate(): { day: number; month: number; year: number } {
  const s = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric', month: 'numeric', day: 'numeric',
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

function renderImage(table: BrandTable, dateUpper: string): Promise<ArrayBuffer> {
  // Telegram brand mark — small SVG inlined as <svg> child so Satori
  // rasterises it as part of the image.
  const TgIcon = (
    <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="22" r="22" fill="#229ED9" />
      <path
        d="M9.5 22.2 l28-12.5 c1.4-.6 2.6.4 2.2 2.1 l-4.4 20.7 c-.3 1.3-1.1 1.6-2.2 1 l-6-4.4 -2.9 2.8 c-.3.3-.6.6-1.2.6 l.4-6.1 11.2-10.1 c.5-.4-.1-.6-.7-.3 L20 22.5 13.7 20.6 c-1.4-.4-1.4-1.4.3-2 z"
        fill="#fff"
      />
    </svg>
  );

  const valueColor = (v: number | undefined) => (v ? '#10b981' : '#475569');

  // Satori expects every <div> with >1 child to have an explicit
  // display value. Easiest path is to add display:'flex' on every
  // wrapper and pass styles explicitly. Top accent bar moved to be a
  // regular flex item (no position:absolute — Satori has weak support
  // for it and it's an extra child source).
  const headerCellStyle = { fontSize: 28, fontWeight: 700, color: '#94a3b8' } as const;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          fontFamily: 'NSArm',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', height: 8, background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', padding: '60px 80px 0 80px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', fontSize: 80, fontWeight: 900, color: '#ffffff' }}>FuelMap</div>
            <div style={{ display: 'flex', fontSize: 80, fontWeight: 900, color: '#10b981', marginLeft: 20 }}>Armenia</div>
          </div>
          <div style={{ display: 'flex', marginTop: 8, fontSize: 32, fontWeight: 600, color: '#94a3b8' }}>
            {`${dateUpper} · ՎԱՌԵԼԻՔԻ ԳՆԵՐԸ ՀԱՅԱՍՏԱՆՈՒՄ`}
          </div>
          <div style={{ display: 'flex', marginTop: 4, fontSize: 26, fontWeight: 500, color: '#64748b' }}>
            գները՝ դրամ/լիտր
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '70px 80px 0 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', flex: '0 0 360px', ...headerCellStyle }}>ԲՐԵՆԴ</div>
            <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', ...headerCellStyle }}>{FUEL_HEAD['92']}</div>
            <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', ...headerCellStyle }}>{FUEL_HEAD['95']}</div>
            <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', ...headerCellStyle }}>{FUEL_HEAD['lpg']}</div>
            <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', ...headerCellStyle }}>{FUEL_HEAD['diesel']}</div>
          </div>

          {BRANDS.map((brand) => {
            const row = table[brand] ?? {};
            return (
              <div
                key={brand}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingTop: 30,
                  paddingBottom: 30,
                  borderBottom: '1px solid #1e293b',
                }}
              >
                <div style={{ display: 'flex', flex: '0 0 360px', fontSize: 38, fontWeight: 700, color: '#ffffff' }}>{brand}</div>
                {FUELS.map((fuel) => {
                  const v = row[fuel];
                  return (
                    <div
                      key={fuel}
                      style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', fontSize: 46, fontWeight: 800, color: valueColor(v) }}
                    >
                      {v != null ? String(v) : '—'}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #334155', padding: '24px 80px 60px 80px' }}>
          <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: '#10b981' }}>🌐 fuelmap.app</div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
            {TgIcon}
            <div style={{ display: 'flex', marginLeft: 16, fontSize: 32, color: '#cbd5e1' }}>
              <div style={{ display: 'flex' }}>Telegram:</div>
              <div style={{ display: 'flex', marginLeft: 12, fontWeight: 700, color: '#ffffff' }}>@fuelmaparmeniachat</div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'NSArm', data: FONT_REGULAR, weight: 400, style: 'normal' },
        { name: 'NSArm', data: FONT_BOLD,    weight: 700, style: 'normal' },
      ],
    }
  );

  return response.arrayBuffer();
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
  const path = `instagram-daily/${new Date().toISOString().slice(0, 10)}-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from('price-photos')
    .upload(path, buf, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`upload: ${error.message}`);
  const { data } = supabase.storage.from('price-photos').getPublicUrl(path);
  return data.publicUrl;
}

async function publishToInstagram(imageUrl: string, caption: string) {
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID!;
  const token = process.env.META_PAGE_ACCESS_TOKEN!;

  const containerRes = await fetch(`https://graph.facebook.com/v23.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error(`media create: ${JSON.stringify(containerData)}`);
  }
  const creationId = containerData.id as string;

  // Poll until container's status_code === FINISHED.
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise((r) => setTimeout(r, 1500));
    const statusRes = await fetch(
      `https://graph.facebook.com/v23.0/${creationId}?fields=status_code&access_token=${token}`
    );
    const statusData = await statusRes.json();
    const code = statusData.status_code as string | undefined;
    if (code === 'FINISHED') break;
    if (code === 'ERROR' || code === 'EXPIRED') {
      throw new Error(`media container ${code}: ${JSON.stringify(statusData)}`);
    }
    if (attempt === 29) {
      throw new Error(`media container did not become FINISHED in 45s; last status=${code}`);
    }
  }

  const publishRes = await fetch(`https://graph.facebook.com/v23.0/${igId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ creation_id: creationId, access_token: token }),
  });
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
    if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const table = await fetchBrandTable(supabase);
    const cellsPosted = BRANDS.reduce((n, b) => n + Object.keys(table[b] ?? {}).length, 0);
    if (cellsPosted === 0) {
      return NextResponse.json({ ok: false, reason: 'no prices in db' }, { status: 200 });
    }

    const { day, month } = yerevanDate();
    const dateUpper = `${day} ${ARM_MONTHS_NOM[month].toUpperCase()}`;
    const dateGenitive = `${day} ${ARM_MONTHS_GEN[month]}`;

    const png = Buffer.from(await renderImage(table, dateUpper));
    const imageUrl = await uploadToStorage(supabase, png);
    const postId = await publishToInstagram(imageUrl, buildCaption(table, dateGenitive));

    // Chain the daily Story. Failures here must not fail the feed
    // post — log, return both outcomes in the response. We hit the
    // route via VERCEL_URL (deployment alias) so the Story endpoint
    // runs in its own serverless invocation and doesn't share our
    // 300s budget end-to-end.
    let storyResult: { ok: boolean; storyId?: string; error?: string } = { ok: false };
    try {
      const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://fuelmap.app';
      const r = await fetch(`${base}/api/cron/instagram-story-cheapest`, {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      storyResult = await r.json();
      if (!r.ok) console.error('[cron/instagram-daily] story chain non-200:', r.status, storyResult);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[cron/instagram-daily] story chain failed:', msg);
      storyResult = { ok: false, error: msg };
    }

    return NextResponse.json({ ok: true, postId, imageUrl, cellsPosted, story: storyResult });
  } catch (err) {
    console.error('[cron/instagram-daily]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
