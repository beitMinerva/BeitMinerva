-- Migration: Add 3 feed component columns to pen_feeding_entries & destination option to pen_milk_entries
-- Alpha, Mixed Grains, Straw - each with total pen kg and price per kg
-- Milk Destination - 'for_sale' (adds to revenue), 'home_use' (family use), 'farm_use' (kid feeding)

ALTER TABLE public.pen_feeding_entries
  ADD COLUMN IF NOT EXISTS alpha_kg NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alpha_price_per_kg NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mixed_grains_kg NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mixed_grains_price_per_kg NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS straw_kg NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS straw_price_per_kg NUMERIC(10,3) DEFAULT 0;

ALTER TABLE public.pen_milk_entries
  ADD COLUMN IF NOT EXISTS destination TEXT DEFAULT 'for_sale';
