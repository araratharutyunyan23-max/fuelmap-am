import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// POST /api/push/send
// Called by Postgres triggers via pg_net. Authenticated by a shared bearer
// (PUSH_SEND_SECRET) — we don't accept user JWTs here, this is server-only.
//
// Body: { user_id, title, body, url? }
// Loads every push subscription for that user and fans out the push.
// Stale endpoints (410 Gone / 404) are deleted so we don't keep hammering
// dead browsers.
export async function POST(req: Request) {
  const expected = process.env.PUSH_SEND_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (token !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }

  const userId: string | undefined = body?.user_id;
  const title: string | undefined = body?.title;
  const message: string | undefined = body?.body;
  const linkUrl: string = body?.url || '/';

  if (!userId || !title || !message) {
    return NextResponse.json({ error: 'bad_payload' }, { status: 400 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@fuelmap.app';
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'vapid_missing' }, { status: 500 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const admin = getSupabaseAdmin();
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const payload = JSON.stringify({ title, body: message, url: linkUrl });
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
      } catch (err: any) {
        // 404/410 mean the browser revoked the subscription; remove it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          dead.push(s.endpoint);
        }
      }
    })
  );

  if (dead.length) {
    await admin.from('push_subscriptions').delete().in('endpoint', dead);
  }

  return NextResponse.json({ ok: true, sent: subs.length - dead.length, pruned: dead.length });
}
