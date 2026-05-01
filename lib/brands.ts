// Canonical brand registry. Single source of truth for brand metadata
// surfaced in the UI (logos in onboarding, color of station markers, what
// shows up in the brand-filter dropdown, tier ordering).
//
// Adding a brand:
//   1. Add an entry below.
//   2. Add an alias regex for OSM matching in scripts/fetch-osm-stations.mjs.
//   3. Re-fetch OSM and re-seed Supabase if you want it backfilled.
//
// Tiers:
//   1 — featured (top of filter list, default visible)
//   2 — secondary (visible by default, but listed below tier 1 in UI)

export type BrandTier = 1 | 2;

export interface Brand {
  slug: string;
  displayName: string;
  color: string;
  tier: BrandTier;
}

export const BRANDS: Brand[] = [
  { slug: 'CPS',        displayName: 'CPS',        color: '#06b6d4', tier: 1 },
  { slug: 'Flash',      displayName: 'Flash',      color: '#dc2626', tier: 1 },
  { slug: 'Max Oil',    displayName: 'Max Oil',    color: '#0d9488', tier: 1 },
  { slug: 'RAN Oil',    displayName: 'RAN Oil',    color: '#d97706', tier: 1 },
  { slug: 'Orange',     displayName: 'Orange',     color: '#c2410c', tier: 1 },
  { slug: 'Gastop',     displayName: 'Gastop',     color: '#65a30d', tier: 1 },
  { slug: 'Titan',      displayName: 'Titan',      color: '#e11d48', tier: 1 },
  { slug: 'Art Petrol', displayName: 'Art Petrol', color: '#db2777', tier: 1 },
  { slug: 'Gulf',       displayName: 'Gulf',       color: '#0c4a6e', tier: 1 },
  { slug: 'Shell',      displayName: 'Shell',      color: '#fbbf24', tier: 1 },
  { slug: 'Gazprom',    displayName: 'Gazprom',    color: '#1e40af', tier: 2 },
  { slug: 'Mika',       displayName: 'Mika',       color: '#7c3aed', tier: 2 },
];

const BY_SLUG: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.slug, b])
);

export function getBrand(slug: string): Brand | undefined {
  return BY_SLUG[slug];
}

export const TIER_1_SLUGS = BRANDS.filter((b) => b.tier === 1).map((b) => b.slug);
