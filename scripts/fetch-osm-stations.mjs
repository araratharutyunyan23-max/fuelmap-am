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

const BRANDS = [
  { match: /flash|ֆլեշ|флэш|флеш/i, name: 'Flash', color: '#dc2626' },
  { match: /shell|շելլ|шелл/i, name: 'Shell', color: '#fbbf24' },
  { match: /gazprom|газпром|գազպրոմ/i, name: 'Gazprom', color: '#1e40af' },
  { match: /sas\b|сас\b/i, name: 'Sas Oil', color: '#f97316' },
  { match: /city\s*petrol/i, name: 'City Petrol', color: '#16a34a' },
  { match: /agat|ագատ|агат/i, name: 'Agat', color: '#9333ea' },
  { match: /max\s*oil|макс\s*ойл/i, name: 'Max Oil', color: '#0d9488' },
  { match: /lukoil|лукойл|լուկօյլ/i, name: 'Lukoil', color: '#991b1b' },
  { match: /tatneft|татнефт/i, name: 'Tatneft', color: '#1e3a8a' },
  { match: /rosneft|роснефть/i, name: 'Rosneft', color: '#facc15' },
  { match: /portal/i, name: 'Portal', color: '#0ea5e9' },
];

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

function pickAddress(tags) {
  const street = tags['addr:street'] || tags['addr:place'] || '';
  const houseNumber = tags['addr:housenumber'] || '';
  const city = tags['addr:city'] || '';
  if (street) return [street, houseNumber, city].filter(Boolean).join(' ').trim();
  return city || 'Адрес не указан';
}

const PRICE_RANGES = {
  '92': [470, 490],
  '95': [510, 540],
  '98': [570, 600],
  diesel: [530, 560],
  lpg: [280, 310],
  cng: [220, 250],
};

const FUEL_LABELS = { '92': 'АИ-92', '95': 'АИ-95', '98': 'АИ-98', diesel: 'Дизель', lpg: 'LPG', cng: 'CNG' };

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

function generatePrices(stationId, hasLPG, hasCNG) {
  const rng = seededRandom(stationId);
  const fuels = ['92', '95', '98', 'diesel'];
  if (hasLPG) fuels.push('lpg');
  if (hasCNG) fuels.push('cng');
  return fuels.map((type) => {
    const [min, max] = PRICE_RANGES[type];
    const price = Math.round(min + rng() * (max - min));
    const trend = Math.round(rng() * 30 - 15);
    const ageMin = Math.floor(rng() * 240);
    const updatedAgo = ageMin < 60 ? `${ageMin} мин назад` : `${Math.floor(ageMin / 60)} ч назад`;
    return { type, label: FUEL_LABELS[type], price, trend, updatedAgo };
  });
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

  const stations = data.elements.map((el) => {
    const id = String(el.id);
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!lat || !lng) return null;
    const tags = el.tags || {};
    const brand = normalizeBrand(tags);
    const name = pickName(tags, brand.name);
    const rng = seededRandom(id + ':fuels');
    const hasLPG = (tags['fuel:lpg'] === 'yes') || rng() < 0.55;
    const hasCNG = (tags['fuel:cng'] === 'yes') || rng() < 0.25;
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
      rating: Math.round((3.8 + ratingRng() * 1.2) * 10) / 10,
      reviews: Math.floor(20 + ratingRng() * 400),
      prices: generatePrices(id, hasLPG, hasCNG),
      hours: DEFAULT_HOURS,
    };
  }).filter(Boolean);

  const counts = {};
  for (const s of stations) counts[s.brand] = (counts[s.brand] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  console.log('\nBrand distribution:');
  for (const [b, c] of sorted) console.log(`  ${b.padEnd(15)} ${c}`);

  const existing = await fs.readFile('lib/data.ts', 'utf-8');
  const newBlock = `export const stations: Station[] = ${JSON.stringify(stations, null, 2)};`;
  const updated = existing.replace(/export const stations: Station\[\] = \[[\s\S]*?\n\];/, newBlock);
  if (updated === existing) {
    console.error('\nFailed to find stations array in lib/data.ts — aborting.');
    process.exit(1);
  }
  await fs.writeFile('lib/data.ts', updated);
  console.log(`\nWrote ${stations.length} stations to lib/data.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
