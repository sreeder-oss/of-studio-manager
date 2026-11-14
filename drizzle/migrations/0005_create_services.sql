CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  pricing_unit text NOT NULL DEFAULT 'sf' CHECK (pricing_unit IN ('sf','day')),
  rate_default numeric NOT NULL DEFAULT 0 CHECK (rate_default >= 0),
  rate_low numeric NOT NULL DEFAULT 0 CHECK (rate_low >= 0),
  rate_high numeric NOT NULL DEFAULT 0 CHECK (rate_high >= 0),
  materials_included boolean NOT NULL DEFAULT false,
  minimum_charge numeric NOT NULL DEFAULT 0 CHECK (minimum_charge >= 0),
  system_id uuid REFERENCES public.systems(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  rate_reviewed_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own services" ON public.services FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own services" ON public.services FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own services" ON public.services FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own services" ON public.services FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();