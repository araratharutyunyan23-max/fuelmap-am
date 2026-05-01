// One-off: delete a user from auth.users by email.
// Run: node --env-file=.env.local scripts/delete-user.mjs <email>
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const email = process.argv[2];
if (!email) { console.error('usage: <email>'); process.exit(1); }

const { data: { users }, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;
const u = users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
if (!u) { console.log(`No user with email ${email}`); process.exit(0); }
console.log(`Found user id=${u.id} email=${u.email} created_at=${u.created_at}`);

const { error } = await sb.auth.admin.deleteUser(u.id);
if (error) throw error;
console.log('Deleted.');
