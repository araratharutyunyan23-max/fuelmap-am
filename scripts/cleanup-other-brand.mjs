// One-off: drop all "Other" brand stations.
// They are mostly OSM nodes with no name/brand tag — no value to surface.
// Run: node --env-file=.env.local scripts/cleanup-other-brand.mjs

import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function counts(label) {
  const { count: stations } = await sb.from('stations').select('*', { count: 'exact', head: true });
  const { count: prices }   = await sb.from('station_prices').select('*', { count: 'exact', head: true });
  const { count: others }   = await sb.from('stations').select('*', { count: 'exact', head: true }).eq('brand', 'Other');
  console.log(`${label}: ${stations} stations · ${prices} prices · ${others} of brand=Other`);
}

await counts('Before');

console.log('Deleting stations where brand = Other ...');
const { error, count } = await sb
  .from('stations')
  .delete({ count: 'exact' })
  .eq('brand', 'Other');
if (error) {
  console.error('  failed:', error.message);
  process.exit(1);
}
console.log(`  deleted ${count} stations (price rows cascaded)`);

await counts('After');

console.log('\nRewriting lib/stations.generated.ts without Other ...');
const path = 'lib/stations.generated.ts';
const text = await fs.readFile(path, 'utf-8');
const start = text.indexOf('= [') + 2;
const end   = text.lastIndexOf('];') + 1;
const stations = JSON.parse(text.slice(start, end));
const filtered = stations.filter((s) => s.brand !== 'Other');
const header = text.slice(0, start - 2);
await fs.writeFile(path, `${header}= ${JSON.stringify(filtered, null, 2)};\n`);
console.log(`  ${stations.length} → ${filtered.length} stations in ${path}`);
