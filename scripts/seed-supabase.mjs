import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run with: node --env-file=.env.local scripts/seed-supabase.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CHUNK = 500;

async function upsertInChunks(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflict });
    if (error) {
      console.error(`Error upserting into ${table}:`, error.message);
      process.exit(1);
    }
    process.stdout.write(`\r  ${table}: ${i + chunk.length}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function main() {
  const text = await fs.readFile('lib/stations.generated.ts', 'utf-8');
  const start = text.indexOf('= [') + 2;
  const end = text.lastIndexOf('];') + 1;
  const stations = JSON.parse(text.slice(start, end));
  console.log(`Loaded ${stations.length} stations from stations.generated.ts`);

  const stationRows = stations.map((s) => ({
    id: s.id,
    name: s.name,
    brand: s.brand,
    brand_color: s.brandColor,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    rating: s.rating,
    reviews_count: s.reviews,
    hours: s.hours,
  }));

  const priceRows = stations.flatMap((s) =>
    s.prices.map((p) => ({
      station_id: s.id,
      fuel_type: p.type,
      label: p.label,
      price: p.price,
      trend: p.trend,
    }))
  );

  console.log(`Upserting ${stationRows.length} stations + ${priceRows.length} prices...\n`);
  await upsertInChunks('stations', stationRows, 'id');
  await upsertInChunks('station_prices', priceRows, 'station_id,fuel_type');

  const { count: stationCount } = await supabase.from('stations').select('*', { count: 'exact', head: true });
  const { count: priceCount } = await supabase.from('station_prices').select('*', { count: 'exact', head: true });
  console.log(`\nDone. DB has ${stationCount} stations, ${priceCount} prices.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
