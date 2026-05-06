// One-shot seed of synthetic station ratings to bootstrap social proof.
// No comments — just numbers. Distribution is weighted to look natural
// (avg ~4.0, occasional 2-3 star), and `created_at` is spread over the
// past 60 days so it doesn't look like one big batch.
//
// Idempotent: re-runs will skip reviews where (station_id, user_id) is
// already taken thanks to the unique constraint and onConflict ignore.
//
// Cleanup if ever needed:
//   delete from public.station_reviews
//    where user_id in (
//      select id from auth.users
//       where email like 'seed%@fuelmap.app'
//    );
//
// Usage:
//   node --env-file=.env.local scripts/seed-ratings.mjs

import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const SEED_USERS_COUNT          = 5;
const RATINGS_PER_STATION_MIN   = 1;
const RATINGS_PER_STATION_MAX   = 2;
const SPREAD_DAYS               = 60;

const RATING_WEIGHTS = [
  { rating: 5, weight: 30 },
  { rating: 4, weight: 50 },
  { rating: 3, weight: 15 },
  { rating: 2, weight: 5 },
];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

function pickWeighted(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight;
    if (r <= 0) return it.rating;
  }
  return items[0].rating;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomCreatedAtIso() {
  const ageMs = Math.random() * SPREAD_DAYS * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ageMs).toISOString();
}

async function ensureSeedUsers() {
  // listUsers paginates; we only need the first 200 since we're looking
  // for at most 5 prefixed accounts.
  const { data, error } = await sb.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  const existing = data.users.filter(
    (u) => u.email?.startsWith('seed') && u.email?.endsWith('@fuelmap.app')
  );
  if (existing.length >= SEED_USERS_COUNT) {
    console.log(`Found ${existing.length} existing seed users, reusing.`);
    return existing.slice(0, SEED_USERS_COUNT);
  }
  console.log(`Creating ${SEED_USERS_COUNT - existing.length} new seed users...`);
  const out = [...existing];
  for (let i = 1; i <= SEED_USERS_COUNT; i++) {
    if (out.find((u) => u.email === `seed${i}@fuelmap.app`)) continue;
    const { data: cu, error: cerr } = await sb.auth.admin.createUser({
      email: `seed${i}@fuelmap.app`,
      password: crypto.randomBytes(24).toString('hex'),
      email_confirm: true,
      user_metadata: { seed: true, name: `seed${i}` },
    });
    if (cerr) {
      console.error(`  failed seed${i}: ${cerr.message}`);
      continue;
    }
    out.push(cu.user);
  }
  return out;
}

async function main() {
  const seedUsers = await ensureSeedUsers();
  console.log(`Seed users: ${seedUsers.map((u) => u.email).join(', ')}`);

  const { data: stations, error: serr } = await sb.from('stations').select('id');
  if (serr) throw serr;
  console.log(`Found ${stations.length} stations.`);

  const rows = [];
  for (const station of stations) {
    const n =
      RATINGS_PER_STATION_MIN +
      Math.floor(Math.random() * (RATINGS_PER_STATION_MAX - RATINGS_PER_STATION_MIN + 1));
    const picked = shuffle(seedUsers).slice(0, n);
    for (const u of picked) {
      rows.push({
        station_id: station.id,
        user_id: u.id,
        rating: pickWeighted(RATING_WEIGHTS),
        comment: null,
        created_at: randomCreatedAtIso(),
      });
    }
  }
  console.log(`Prepared ${rows.length} review rows.`);

  // Tally for sanity check.
  const tally = rows.reduce((m, r) => ((m[r.rating] = (m[r.rating] || 0) + 1), m), {});
  console.log('Rating distribution:', tally);

  let inserted = 0;
  let skipped = 0;
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { data: ins, error: ierr } = await sb
      .from('station_reviews')
      .upsert(slice, { onConflict: 'station_id,user_id', ignoreDuplicates: true })
      .select('id');
    if (ierr) {
      console.error(`Batch starting ${i}: ${ierr.message}`);
      continue;
    }
    inserted += ins.length;
    skipped += slice.length - ins.length;
    process.stdout.write(`  inserted ${inserted}, skipped ${skipped}\r`);
  }
  console.log(`\nDone. Inserted ${inserted} reviews, skipped ${skipped} dupes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
