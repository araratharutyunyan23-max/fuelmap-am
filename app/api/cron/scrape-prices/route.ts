// Vercel cron entry point for the daily price refresh.
//
// Replaces the GitHub Actions scheduled workflow (which had 4-6 hour
// drift during peak UTC). Vercel cron fires within seconds of its
// scheduled time. The schedule itself lives in vercel.json — that's
// the file Vercel reads to register the cron job.
//
// Auth: Vercel signs all cron requests with `Authorization: Bearer
// $CRON_SECRET`. Set CRON_SECRET in Vercel project env vars to a long
// random string and rotate it if it ever leaks.

import { NextRequest, NextResponse } from 'next/server';
import { runScraper } from '@/scripts/scrape-prices.mjs';

// The scraper hits 3 external sites + ~6 Supabase round-trips. 60s is
// usually enough; bump to the Hobby-tier max (300s) so a slow
// upstream doesn't kill the run.
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    await runScraper();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[cron/scrape-prices]', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
