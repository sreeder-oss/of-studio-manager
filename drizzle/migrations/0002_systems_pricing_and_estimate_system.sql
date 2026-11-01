ALTER TABLE public.systems
  ADD COLUMN waste_factor numeric NOT NULL DEFAULT 0.12 CHECK (waste_factor >= 0 AND waste_factor < 1),
  ADD COLUMN min_charge numeric CHECK (min_charge IS NULL OR min_charge >= 0),
  ADD COLUMN sundries_pct numeric NOT NULL DEFAULT 0.05 CHECK (sundries_pct >= 0 AND sundries_pct < 1),
  ADD COLUMN prep_tier_notes text;
ALTER TABLE public.estimates
  ADD COLUMN system_id uuid REFERENCES public.systems(id) ON DELETE SET NULL,
  ADD COLUMN area_sf numeric CHECK (area_sf IS NULL OR area_sf >= 0);