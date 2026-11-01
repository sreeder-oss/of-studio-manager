CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid(),
  default_tax_rate numeric NOT NULL DEFAULT 0.0875 CHECK (default_tax_rate >= 0 AND default_tax_rate < 1),
  default_overhead_pct numeric NOT NULL DEFAULT 0.15 CHECK (default_overhead_pct >= 0 AND default_overhead_pct < 1),
  default_profit_pct numeric NOT NULL DEFAULT 0.20 CHECK (default_profit_pct >= 0 AND default_profit_pct < 1),
  default_deposit_pct numeric NOT NULL DEFAULT 0.50 CHECK (default_deposit_pct >= 0 AND default_deposit_pct <= 1),
  minimum_charge numeric NOT NULL DEFAULT 0 CHECK (minimum_charge >= 0),
  default_waste_factor numeric NOT NULL DEFAULT 0.12 CHECK (default_waste_factor >= 0 AND default_waste_factor < 1),
  sundries_pct numeric NOT NULL DEFAULT 0.05 CHECK (sundries_pct >= 0 AND sundries_pct < 1),
  mobilization_fee numeric NOT NULL DEFAULT 0 CHECK (mobilization_fee >= 0),
  terms_text text,
  company_name text NOT NULL DEFAULT 'Organic Finishes LLC',
  company_address text,
  license_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own settings" ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();