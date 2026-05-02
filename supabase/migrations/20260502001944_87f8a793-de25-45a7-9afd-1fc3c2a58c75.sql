
CREATE TABLE public.systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  manufacturer text,
  description text,
  coats integer DEFAULT 2,
  coverage_rate numeric,
  coverage_unit text,
  cost_per_unit numeric,
  labor_rate_per_sf numeric,
  typical_equipment text,
  substrate_notes text,
  application_notes text,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own systems" ON public.systems FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own systems" ON public.systems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own systems" ON public.systems FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own systems" ON public.systems FOR DELETE USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_systems_updated_at
BEFORE UPDATE ON public.systems
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
