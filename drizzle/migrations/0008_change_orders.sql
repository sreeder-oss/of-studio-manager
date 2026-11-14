CREATE TABLE public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  agreed_on date,
  status text NOT NULL DEFAULT 'Proposed' CHECK (status IN ('Proposed','Approved','Declined')),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX change_orders_project_idx ON public.change_orders(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_orders TO authenticated;
GRANT ALL ON public.change_orders TO service_role;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own change orders" ON public.change_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own change orders" ON public.change_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));
CREATE POLICY "Users can update own change orders" ON public.change_orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()) AND (invoice_id IS NULL OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.user_id = auth.uid())));
CREATE POLICY "Users can delete own change orders" ON public.change_orders FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER change_orders_updated_at BEFORE UPDATE ON public.change_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();