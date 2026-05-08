// One-off probe to verify the Vercel cron scheduler is firing at all.
//
// Hobby plans run each cron path at most once per day. Today the
// scrape-prices and instagram-daily paths have already "tried" to
// fire (and were blocked by SSO Protection on the deployment URL),
// so Vercel won't retry them today no matter how many times we
// reschedule. This path is fresh — if it fires, the scheduler is
// healthy and tomorrow's natural runs will succeed.
//
// On fire, this hands off to scrape-prices via internal fetch so the
// observable signal is fresh updated_at rows in station_prices —
// same evidence we'd look for if scrape-prices had fired directly.

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const firedAt = new Date().toISOString();
  console.log(`[cron/sanity] fired at ${firedAt}`);

  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://fuelmap.app';
    const r = await fetch(`${base}/api/cron/scrape-prices`, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const scrapeResult = await r.json();
    return NextResponse.json({ ok: true, firedAt, scrapeResult });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[cron/sanity] scrape chain failed:', msg);
    return NextResponse.json({ ok: false, firedAt, error: msg }, { status: 500 });
  }
}
