import fs from 'node:fs/promises';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const QUERY = `
[out:json][timeout:90];
area["ISO3166-1"="AM"][admin_level=2]->.am;
(
  node["amenity"="fuel"](area.am);
  way["amenity"="fuel"](area.am);
);
out center tags;
`;

// Source of truth for brand colors + tiers lives in lib/brands.ts.
// This array adds OSM-specific match regexes on top.
// To add a brand: register it in lib/brands.ts AND add a match line here.
const BRANDS = [
  { match: /flash|ֆլեշ|флэш|флеш/i, name: 'Flash', color: '#dc2626' },
  { match: /shell|շելլ|шелл/i, name: 'Shell', color: '#fbbf24' },
  { match: /max\s*oil|макс\s*ойл/i, name: 'Max Oil', color: '#0d9488' },
  { match: /\bcps\b/i, name: 'CPS', color: '#06b6d4' },
  { match: /ran\s*oil|ран\s*ойл/i, name: 'RAN Oil', color: '#d97706' },
  { match: /\borange\b|օրանժ|оранж/i, name: 'Orange', color: '#c2410c' },
  { match: /gastop|газтоп/i, name: 'Gastop', color: '#65a30d' },
  { match: /\btitan\b|տիտան|титан/i, name: 'Titan', color: '#e11d48' },
  { match: /\bgulf\b|гулф/i, name: 'Gulf', color: '#0c4a6e' },
  { match: /art\s*petrol|արտ\s*պետրոլ|арт\s*петрол/i, name: 'Art Petrol', color: '#db2777' },
];

// Stations that don't match any brand are dropped — see filter in main().
// Set KEEP_OTHER=1 to include them (e.g. for one-off audits).
const FALLBACK = { name: 'Other', color: '#64748b' };

function normalizeBrand(tags) {
  const candidates = [
    tags.brand, tags['brand:en'], tags['brand:ru'], tags['brand:hy'],
    tags.name, tags['name:en'], tags['name:ru'], tags['name:hy'],
    tags.operator, tags['operator:en'], tags['operator:ru'], tags['operator:hy'],
  ].filter(Boolean);
  for (const c of candidates) {
    for (const b of BRANDS) {
      if (b.match.test(c)) return { name: b.name, color: b.color };
    }
  }
  return FALLBACK;
}

function pickName(tags, brandName) {
  return tags['name:ru'] || tags.name || tags['name:en'] || tags['name:hy'] || brandName;
}

// Build the friendliest address string we can from whatever OSM tags exist.
// Priority order, most-specific first:
//   1. street + housenumber, optionally with city/village/region
//   2. street alone, optionally with city/village/region
//   3. just a place name (village/hamlet/suburb/city), optionally with region
//   4. just region (Lori, Tavush, Yerevan…)
//   5. fallback: 'Адрес не указан'
//
// Region tags (`addr:state`, `is_in:state`) tend to be in English/Armenian;
// the rest are usually native-language. We don't translate — the rendered text
// matches what OSM contributors put in.
function pickAddress(tags) {
  const street = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const place =
    tags['addr:village'] ||
    tags['addr:hamlet'] ||
    tags['addr:suburb'] ||
    tags['addr:district'] ||
    tags['addr:city'] ||
    tags['addr:place'];
  const region =
    tags['addr:state'] ||
    tags['addr:province'] ||
    tags['addr:region'] ||
    tags['is_in:state'] ||
    tags['is_in:province'];

  if (street) {
    const left = [street, houseNumber].filter(Boolean).join(' ');
    return [left, place, region].filter(Boolean).join(', ').trim();
  }
  if (place) {
    return [place, region].filter(Boolean).join(', ').trim();
  }
  if (region) {
    return region;
  }
  return 'Адрес не указан';
}

function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

const DEFAULT_HOURS = [
  { day: 'Пн', time: '06:00 – 23:00' },
  { day: 'Вт', time: '06:00 – 23:00' },
  { day: 'Ср', time: '06:00 – 23:00', isToday: true },
  { day: 'Чт', time: '06:00 – 23:00' },
  { day: 'Пт', time: '06:00 – 23:00' },
  { day: 'Сб', time: '07:00 – 22:00' },
  { day: 'Вс', time: '08:00 – 21:00' },
];

const YEREVAN_CENTER = { lat: 40.1872, lng: 44.5152 };

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
}

async function main() {
  console.log('Fetching gas stations from Overpass API...');
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    body: 'data=' + encodeURIComponent(QUERY),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'FuelMap-Armenia/0.1 (araratharutyunyan23@gmail.com)',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    console.error('Overpass error:', res.status, await res.text());
    process.exit(1);
  }
  const data = await res.json();
  console.log(`Got ${data.elements.length} OSM elements`);

  const keepOther = process.env.KEEP_OTHER === '1';
  const stations = data.elements.map((el) => {
    const id = String(el.id);
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) return null;
    const tags = el.tags || {};
    const brand = normalizeBrand(tags);
    const name = pickName(tags, brand.name);
    const ratingRng = seededRandom(id + ':r');
    return {
      id,
      name,
      brand: brand.name,
      brandColor: brand.color,
      address: pickAddress(tags),
      lat,
      lng,
      distance: haversineKm({ lat, lng }, YEREVAN_CENTER),
      // rating + reviews are still placeholder seed values until we wire reviews.
      rating: Math.round((3.8 + ratingRng() * 1.2) * 10) / 10,
      reviews: Math.floor(20 + ratingRng() * 400),
      // Prices come from scripts/scrape-prices.mjs, not OSM.
      prices: [],
      hours: DEFAULT_HOURS,
    };
  }).filter((s) => s && (keepOther || s.brand !== 'Other'));

  const counts = {};
  for (const s of stations) counts[s.brand] = (counts[s.brand] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log('\nBrand distribution:');
  for (const [b, c] of sorted) console.log(`  ${b.padEnd(15)} ${c}`);

  if (process.env.DEBUG_OTHER === '1') {
    const otherNames = {};
    for (const el of data.elements) {
      const tags = el.tags || {};
      const brand = normalizeBrand(tags);
      if (brand.name !== 'Other') continue;
      const candidates = [tags.brand, tags.name, tags['name:en'], tags['name:ru'], tags['name:hy'], tags.operator].filter(Boolean);
      const key = candidates[0] || '(no name/brand)';
      otherNames[key] = (otherNames[key] || 0) + 1;
    }
    console.log('\nTop "Other" names (raw):');
    Object.entries(otherNames).sort((a, b) => b[1] - a[1]).slice(0, 60).forEach(([n, c]) => {
      console.log(`  ${String(c).padStart(3)} × ${n}`);
    });
  }

  const header = `// AUTO-GENERATED by scripts/fetch-osm-stations.mjs — do not edit by hand.\n// Source: OpenStreetMap via Overpass API. Run \`node scripts/fetch-osm-stations.mjs\` to refresh.\nimport type { Station } from './data';\n\n`;
  const body = `export const stations: Station[] = ${JSON.stringify(stations, null, 2)};\n`;
  await fs.writeFile('lib/stations.generated.ts', header + body);
  console.log(`\nWrote ${stations.length} stations to lib/stations.generated.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
