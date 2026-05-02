// Generates PNG icons for the PWA from the master SVGs in /public.
// Run after editing public/icon.svg or public/icon-maskable.svg:
//   node scripts/generate-icons.mjs

import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const PUBLIC = path.resolve('public');

async function render(srcSvg, outName, size, { background } = {}) {
  const buf = await fs.readFile(path.join(PUBLIC, srcSvg));
  let img = sharp(buf, { density: 384 }).resize(size, size);
  if (background) img = img.flatten({ background });
  await img.png().toFile(path.join(PUBLIC, outName));
  console.log(`  ${outName.padEnd(28)} ${size}×${size}`);
}

console.log('Generating PWA icons:');
await render('icon.svg',          'icon-192.png',           192);
await render('icon.svg',          'icon-512.png',           512);
await render('icon-maskable.svg', 'icon-maskable-192.png',  192);
await render('icon-maskable.svg', 'icon-maskable-512.png',  512);
// iOS home-screen icon — flat, 180×180, no transparency.
await render('icon.svg',          'apple-icon.png',         180, { background: '#ffffff' });
console.log('Done.');
