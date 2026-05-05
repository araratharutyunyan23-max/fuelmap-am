-- ============================================================================
-- FuelMap Armenia — Phase 23: register Fly Oil and EDE as first-class brands
--
-- Both stations were submitted via "Сообщить АЗС" on 2026-05-05 and approved
-- in the admin with brand = 'Other'. Brands are now registered in
-- lib/brands.ts and scripts/fetch-osm-stations.mjs; this migration retags
-- the two existing rows so they render with the proper marker color
-- instead of the generic "Other" slate.
-- ============================================================================

update public.stations
set brand       = 'Fly Oil',
    brand_color = '#2563eb',
    updated_at  = now()
where brand = 'Other'
  and abs(lat - 40.1729863596271) < 0.0005
  and abs(lng - 44.4373524008107) < 0.0005;

update public.stations
set brand       = 'EDE',
    brand_color = '#4f46e5',
    updated_at  = now()
where brand = 'Other'
  and abs(lat - 40.2543492810309) < 0.0005
  and abs(lng - 44.4194069384355) < 0.0005;
