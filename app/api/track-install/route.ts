// POST /api/track-install
// Called from the client when the PWA is opened in standalone mode for
// the first time, OR when Chrome fires `appinstalled`. Two side
// effects:
//   1. Telegram ping to the admin channel — celebration / monitoring
//   2. user_balance.installed_at = now() (if signed in and not yet
//      installed). Flipping that column trips the
//      credit_install_and_referral DB trigger which credits the
//      welcome bonus + referrer bonus.
//
// No user JWT required: an anonymous device can install the PWA
// without an account. We rate-limit per IP to prevent a single bot
// from spamming the channel.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;
const ipHits = new Map<string, number[]>();

function withinRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (bucket.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, bucket);
    return false;
  }
  bucket.push(now);
  ipHits.set(ip, bucket);
  return true;
}

function describePlatform(ua: string): string {
  if (/iPad|iPhone|iPod/.test(ua)) return 'iPhone Safari';
  if (/Android/.test(ua)) {
    if (/Chrome/.test(ua)) return 'Android Chrome';
    if (/Firefox/.test(ua)) return 'Android Firefox';
    return 'Android';
  }
  if (/Windows/.test(ua)) return 'Windows desktop';
  if (/Macintosh/.test(ua)) return 'Mac desktop';
  return 'другое';
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  if (!withinRateLimit(ip)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let body: { locale?: string; trigger?: string; user_id?: string; user_email?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — we still log the install */
  }
  const ua = req.headers.get('user-agent') ?? '';
  const platform = describePlatform(ua);
  const locale = body.locale === 'hy' ? 'hy' : 'ru';
  const trigger = body.trigger === 'appinstalled' ? 'appinstalled' : 'standalone-open';
  const who = body.user_email || 'Гость';

  // If the install is happening on a signed-in account, mark
  // user_balance.installed_at — this trips the DB trigger that
  // pays out welcome + referral bonuses on first install ever.
  if (body.user_id) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await supabase
          .from('user_balance')
          .update({ installed_at: new Date().toISOString() })
          .eq('user_id', body.user_id)
          .is('installed_at', null);
      }
    } catch (err) {
      console.warn('[track-install] failed to mark installed_at:', err);
    }
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    // Don't 500 — analytics should never break the user. Just log + ack.
    console.warn('[track-install] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');
    return NextResponse.json({ ok: true, skipped: 'no_telegram' });
  }

  const message =
    `📲 Новая установка PWA\n\n` +
    `Платформа: ${platform}\n` +
    `Язык: ${locale}\n` +
    `Юзер: ${who}\n` +
    `Триггер: ${trigger}`;

  const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    }),
  });
  if (!r.ok) {
    return NextResponse.json({ error: `telegram_${r.status}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
