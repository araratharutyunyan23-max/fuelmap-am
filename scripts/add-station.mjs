// Insert or update stations from a hardcoded list.
//
// For each entry: look up existing rows in public.stations within 50 m of
// the supplied coordinates (haversine).
//   * if a match exists  → UPDATE its `address` to the supplied English text
//                          (keeps the canonical OSM id + cascaded prices)
//   * otherwise          → INSERT a new manual_<8char> row, reverse-geocode
//                          address_hy from Nominatim
//
// Run: node --env-file=.env.local scripts/add-station.mjs

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const UA = 'FuelMap-Armenia/0.1 (araratharutyunyan23@gmail.com)';
const DUP_DISTANCE_M = 50;

const BRAND_COLORS = {
  'CPS':        '#06b6d4',
  'Flash':      '#dc2626',
  'Max Oil':    '#0d9488',
  'RAN Oil':    '#d97706',
  'Orange':     '#c2410c',
  'Gastop':     '#65a30d',
  'Titan':      '#e11d48',
  'Art Petrol': '#db2777',
  'Gulf':       '#0c4a6e',
  'Shell':      '#fbbf24',
};

const DEFAULT_HOURS = [
  { day: 'Пн', time: '06:00 – 23:00' },
  { day: 'Вт', time: '06:00 – 23:00' },
  { day: 'Ср', time: '06:00 – 23:00', isToday: true },
  { day: 'Чт', time: '06:00 – 23:00' },
  { day: 'Пт', time: '06:00 – 23:00' },
  { day: 'Сб', time: '07:00 – 22:00' },
  { day: 'Вс', time: '08:00 – 21:00' },
];

// ----------------------------------------------------------------------------
// Stations to insert / reconcile.
// Format: { brand, lat, lng, address, name? }
// `address` is canonical and overwrites whatever existing OSM tag values say.
// Replace this array per batch — script is idempotent so re-running entries
// already in the DB is a safe no-op.
// ----------------------------------------------------------------------------
const STATIONS = [
  // ===================== Avra (6 of 8) =====================
  // Geocoded via Nominatim. Two branches still need exact coords:
  //   - Tsovakal Isakov Ave, 22/2, Yerevan
  //   - Mayrakaghakain St, 90, Parakar
  { brand: 'Avra', lat: 40.164657, lng: 44.512426, address: 'Tigran Mets Ave, 36/1, Yerevan' },
  { brand: 'Avra', lat: 40.200130, lng: 44.535686, address: 'Davit Anhaght St, 10/1, Yerevan' },
  { brand: 'Avra', lat: 40.144336, lng: 44.510373, address: 'Artsakh Ave, 23/16, Yerevan' },
  { brand: 'Avra', lat: 40.154210, lng: 44.539710, address: 'Davit Bek St, 83/12, Yerevan' },
  { brand: 'Avra', lat: 40.163840, lng: 44.401060, address: 'Mayrakaghakain St, 33, Parakar' },
  { brand: 'Avra', lat: 40.877990, lng: 45.143750, address: 'Artsakhyan St, 38, Ijevan' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function distM(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)));
}

async function reverseGeocodeHy(lat, lng) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}` +
    `&format=json&zoom=14&accept-language=hy,ru,en`;
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) return null;
  const data = await r.json();
  const a = data?.address;
  if (!a) return null;
  const place =
    a.village || a.hamlet || a.town || a.city || a.municipality ||
    a.suburb || a.neighbourhood || a.locality;
  const region =
    a.county || a.state_district || a.state || a.region || a.province;
  return [place, region].filter(Boolean).join(', ').trim() || null;
}

async function main() {
  console.log(`Loading existing stations…`);
  const { data: existing } = await sb.from('stations').select('id, brand, lat, lng');
  console.log(`  ${existing.length} stations in DB\n`);

  const counts = { updated: 0, inserted: 0, failed: 0 };

  for (const [i, s] of STATIONS.entries()) {
    const tag = `[${i + 1}/${STATIONS.length}]`;
    const color = BRAND_COLORS[s.brand];
    if (!color) {
      console.error(`${tag} ✗ unknown brand "${s.brand}"`);
      counts.failed++;
      continue;
    }

    // 50m duplicate check
    const closest = existing
      .map((e) => ({ ...e, dist: distM({ lat: s.lat, lng: s.lng }, e) }))
      .filter((e) => e.dist < DUP_DISTANCE_M)
      .sort((a, b) => a.dist - b.dist)[0];

    if (closest) {
      const { error } = await sb
        .from('stations')
        .update({ address: s.address, brand: s.brand, brand_color: color })
        .eq('id', closest.id);
      if (error) {
        console.error(`${tag} ✗ update ${closest.id}: ${error.message}`);
        counts.failed++;
      } else {
        console.log(`${tag} ⊕ matched ${closest.id} (${closest.dist}m, was ${closest.brand}) → updated address`);
        counts.updated++;
      }
      continue;
    }

    // No existing → INSERT new
    const id = `manual_${randomUUID().slice(0, 8)}`;
    const addressHy = await reverseGeocodeHy(s.lat, s.lng);
    await sleep(1100); // Nominatim 1 req/s

    const row = {
      id,
      name: s.name ?? s.brand,
      brand: s.brand,
      brand_color: color,
      address: s.address,
      address_hy: addressHy,
      lat: s.lat,
      lng: s.lng,
      rating: null,
      reviews_count: 0,
      hours: DEFAULT_HOURS,
    };

    const { error } = await sb.from('stations').insert(row);
    if (error) {
      console.error(`${tag} ✗ insert: ${error.message}`);
      counts.failed++;
    } else {
      // Add to existing in-memory list so subsequent rows can dedupe against it.
      existing.push({ id, brand: s.brand, lat: s.lat, lng: s.lng });
      console.log(`${tag} ✓ inserted ${id}: ${s.brand} — ${s.address}`);
      counts.inserted++;
    }
  }

  console.log(`\nDone. Updated: ${counts.updated}, inserted: ${counts.inserted}, failed: ${counts.failed}.`);
  console.log(`Next: run \`node --env-file=.env.local scripts/scrape-prices.mjs\` to set prices on new stations.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
