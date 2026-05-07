// Daily Instagram Story — finds the cheapest Regular (92), Premium (95)
// and LPG stations for today and publishes a 1080x1920 Story to
// @fuelmap_armenia. Fires from Vercel Cron at 11:05 Yerevan (07:05 UTC),
// five minutes after the feed post so we don't double-spam the audience.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const FONT_DIR = join(process.cwd(), 'fonts');
const FONT_REGULAR: ArrayBuffer = readFileSync(join(FONT_DIR, 'NotoSansArmenian-Regular.ttf')).buffer.slice(0) as ArrayBuffer;
const FONT_BOLD: ArrayBuffer = readFileSync(join(FONT_DIR, 'NotoSansArmenian-Bold.ttf')).buffer.slice(0) as ArrayBuffer;

const ARM_MONTHS_GEN = ['Հունվարի','Փետրվարի','Մարտի','Ապրիլի','Մայիսի','Հունիսի','Հուլիսի','Օգոստոսի','Սեպտեմբերի','Հոկտեմբերի','Նոյեմբերի','Դեկտեմբերի'];

const FUELS_TO_SHOW = [
  { key: '92',  label: 'Regular' },
  { key: '95',  label: 'Premium' },
  { key: 'lpg', label: 'LPG' },
] as const;

function yerevanDate(): { day: number; month: number; year: number } {
  const s = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric', month: 'numeric', day: 'numeric',
  });
  const [m, d, y] = s.split('/').map(Number);
  return { day: d, month: m - 1, year: y };
}

type CheapestRow = {
  fuel: string;
  label: string;
  price: number;
  brand: string;
  name: string;
  address: string;
};

async function fetchCheapestForFuel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  fuel: string,
  label: string,
): Promise<CheapestRow | null> {
  const { data, error } = await supabase
    .from('station_prices')
    .select('price, stations:station_id!inner(name, brand, address, address_hy)')
    .eq('fuel_type', fuel)
    .gt('price', 0)
    .order('price', { ascending: true })
    .limit(1);
  if (error) throw new Error(`fetchCheapest ${fuel}: ${error.message}`);
  const row = (data ?? [])[0];
  if (!row?.stations) return null;
  return {
    fuel,
    label,
    price: row.price as number,
    brand: row.stations.brand as string,
    name: (row.stations.name as string) ?? row.stations.brand,
    address: (row.stations.address_hy as string) || (row.stations.address as string) || '',
  };
}

function renderStory(rows: CheapestRow[], dateGenitive: string): Promise<ArrayBuffer> {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #064e3b 100%)',
          fontFamily: 'NSArm',
          color: '#ffffff',
          padding: '110px 70px 90px 70px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 900 }}>FuelMap</div>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, color: '#10b981', marginLeft: 18 }}>Armenia</div>
        </div>
        <div style={{ display: 'flex', marginTop: 12, fontSize: 34, color: '#94a3b8' }}>
          {dateGenitive}
        </div>

        <div style={{ display: 'flex', marginTop: 60, fontSize: 64, fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
          Ամենաէժան այսօր
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56 }}>
          {rows.map((row) => (
            <div
              key={row.fuel}
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginBottom: 32,
                padding: '34px 44px',
                background: 'rgba(15,23,42,0.65)',
                borderRadius: 28,
                border: '2px solid #10b981',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline' }}>
                <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: '#10b981' }}>{row.label}</div>
                <div style={{ display: 'flex', flex: 1 }} />
                <div style={{ display: 'flex', fontSize: 124, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                  {row.price}
                </div>
                <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#cbd5e1', marginLeft: 16 }}>֏ / լ</div>
              </div>
              <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: '#ffffff', marginTop: 16 }}>{row.brand}</div>
              {row.address ? (
                <div style={{ display: 'flex', fontSize: 26, color: '#94a3b8', marginTop: 6, lineHeight: 1.3 }}>{row.address}</div>
              ) : (
                <div style={{ display: 'flex' }} />
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flex: 1 }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, color: '#10b981' }}>🌐 fuelmap.app</div>
          <div style={{ display: 'flex', fontSize: 30, color: '#cbd5e1', marginTop: 12 }}>
            բոլոր ԲԿ-ները քարտեզի վրա
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: 'NSArm', data: FONT_REGULAR, weight: 400, style: 'normal' },
        { name: 'NSArm', data: FONT_BOLD,    weight: 700, style: 'normal' },
      ],
    }
  ).arrayBuffer();
}

async function uploadToStorage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  buf: Buffer
): Promise<string> {
  const path = `instagram-story/${new Date().toISOString().slice(0, 10)}-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from('price-photos')
    .upload(path, buf, { contentType: 'image/png', upsert: true });
  if (error) throw new Error(`upload: ${error.message}`);
  const { data } = supabase.storage.from('price-photos').getPublicUrl(path);
  return data.publicUrl;
}

async function publishStory(imageUrl: string): Promise<string> {
  const igId = process.env.IG_BUSINESS_ACCOUNT_ID!;
  const token = process.env.META_PAGE_ACCESS_TOKEN!;

  const containerRes = await fetch(`https://graph.facebook.com/v23.0/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      image_url: imageUrl,
      media_type: 'STORIES',
      access_token: token,
    }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok || !containerData.id) {
    throw new Error(`media create: ${JSON.stringify(containerData)}`);
  }
  const creationId = containerData.id as string;

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

    const fetched = await Promise.all(
      FUELS_TO_SHOW.map((f) => fetchCheapestForFuel(supabase, f.key, f.label))
    );
    const rows = fetched.filter((r): r is CheapestRow => r !== null);
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, reason: 'no prices in db' }, { status: 200 });
    }

    const { day, month } = yerevanDate();
    const dateGenitive = `${day} ${ARM_MONTHS_GEN[month]}`;

    const png = Buffer.from(await renderStory(rows, dateGenitive));
    const imageUrl = await uploadToStorage(supabase, png);
    const storyId = await publishStory(imageUrl);

    return NextResponse.json({ ok: true, storyId, imageUrl, rows });
  } catch (err) {
    console.error('[cron/instagram-story-cheapest]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
