import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// POST /api/push/subscribe
// Body: { endpoint, keys: { p256dh, auth } }
// Auth: client's Supabase access_token in Authorization header. We verify it
// against the project (using the anon client) to find the user, then upsert
// the subscription row with the service role.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (!token) {
    return NextResponse.json({ error: 'missing_auth' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return NextResponse.json({ error: 'invalid_user' }, { status: 401 });
  }
  const userId = userData.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_body' }, { status: 400 });
  }

  const endpoint: string | undefined = body?.endpoint;
  const p256dh: string | undefined = body?.keys?.p256dh;
  const authKey: string | undefined = body?.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: 'bad_subscription' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 200) ?? null;

  // Upsert by endpoint — if the same browser re-subscribes, refresh the
  // user_id / keys instead of leaving an orphan row.
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: userAgent,
      },
      { onConflict: 'endpoint' }
    );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe?endpoint=...
// Lets the client unsubscribe (e.g. user toggled the switch off in profile).
export async function DELETE(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ')
    ? auth.slice(7).trim()
    : '';
  if (!token) return NextResponse.json({ error: 'missing_auth' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: 'invalid_user' }, { status: 401 });

  const reqUrl = new URL(req.url);
  const endpoint = reqUrl.searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ error: 'bad_endpoint' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', userData.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
