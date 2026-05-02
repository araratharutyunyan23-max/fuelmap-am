// Reverse-geocode every station with accept-language=hy and write into address_hy.
// Idempotent: only touches rows where address_hy IS NULL.
//
// Run: node --env-file=.env.local scripts/enrich-addresses-hy.mjs
//
// Nominatim policy: 1 req/s, custom User-Agent.

import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const UA = 'FuelMap-Armenia/0.1 (araratharutyunyan23@gmail.com)';
const RATE_MS = 1100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reverseGeocode(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=json&zoom=14&accept-language=hy,ru,en`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (r.status === 429) throw new Error('rate-limited');
  if (!r.ok) throw new Error(`nominatim ${r.status}`);
  return r.json();
}

function buildAddress(nom) {
  const a = nom?.address;
  if (!a) return null;
  const place =
    a.village || a.hamlet || a.town || a.city || a.municipality ||
    a.suburb || a.neighbourhood || a.locality;
  const region =
    a.county || a.state_district || a.state || a.region || a.province;
  return [place, region].filter(Boolean).join(', ').trim() || null;
}

const { data: stations, error } = await sb
  .from('stations')
  .select('id, lat, lng, address, address_hy')
  .is('address_hy', null);
if (error) throw error;

console.log(`Reverse-geocoding ${stations.length} stations in HY (~${Math.round((stations.length * RATE_MS) / 1000)}s)…`);
let updated = 0;
let skipped = 0;
let failed = 0;

for (let i = 0; i < stations.length; i++) {
  const s = stations[i];
  const t0 = Date.now();
  let line = `[${i + 1}/${stations.length}]`;

  try {
    const nom = await reverseGeocode(s.lat, s.lng);
    const addr = buildAddress(nom);
    if (addr) {
      const { error: upErr } = await sb.from('stations').update({ address_hy: addr }).eq('id', s.id);
      if (upErr) throw upErr;
      updated++;
      line += ` ✓ ${addr}`;
    } else {
      skipped++;
      line += ` —  no result`;
    }
  } catch (err) {
    failed++;
    line += ` ✗ ${err.message}`;
    if (err.message === 'rate-limited') await sleep(5000);
  }
  console.log(line);

  const elapsed = Date.now() - t0;
  if (elapsed < RATE_MS) await sleep(RATE_MS - elapsed);
}

console.log(`\nDone. Updated: ${updated}, no result: ${skipped}, errors: ${failed}`);
