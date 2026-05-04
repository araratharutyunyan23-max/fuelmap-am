import { createClient } from '@supabase/supabase-js';

// Service-role client for server-only use (API routes). Bypasses RLS,
// so it MUST never be exposed to the browser. Lives next to the
// browser-side `lib/supabase.ts` to make the boundary obvious.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
