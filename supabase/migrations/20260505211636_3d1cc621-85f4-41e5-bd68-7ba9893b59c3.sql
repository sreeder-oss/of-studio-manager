
-- =============================================================
-- PHASE 1: DATA MODEL & SECURITY FOUNDATION (idempotent)
-- =============================================================

-- ---------- 1. Estimates: pricing columns + constraints ----------

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS direct_cost_subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_amount      numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_amount        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pre_tax_total        numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount           numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes                text,
  ADD COLUMN IF NOT EXISTS terms                text,
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz NOT NULL DEFAULT now();

-- defaults / not-null safety
UPDATE public.estimates SET subtotal = 0 WHERE subtotal IS NULL;
UPDATE public.estimates SET tax_rate = 0.0875 WHERE tax_rate IS NULL;
UPDATE public.estimates SET total = 0 WHERE total IS NULL;
UPDATE public.estimates SET status = 'Pending' WHERE status IS NULL;
UPDATE public.estimates SET line_items = '[]'::jsonb WHERE line_items IS NULL;

ALTER TABLE public.estimates
  ALTER COLUMN subtotal   SET NOT NULL,
  ALTER COLUMN tax_rate   SET NOT NULL,
  ALTER COLUMN total      SET NOT NULL,
  ALTER COLUMN status     SET NOT NULL,
  ALTER COLUMN line_items SET NOT NULL;

-- Replace existing status check to include Declined/Expired
ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_status_check;
ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_status_check
    CHECK (status IN ('Pending','Approved','Declined','Invoiced','Expired'));

DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_tax_rate_fraction CHECK (tax_rate >= 0 AND tax_rate <= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_subtotal_nonneg CHECK (subtotal >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_total_nonneg CHECK (total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_dcs_nonneg CHECK (direct_cost_subtotal >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_oh_nonneg CHECK (overhead_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_profit_nonneg CHECK (profit_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_pretax_nonneg CHECK (pre_tax_total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.estimates ADD CONSTRAINT estimates_tax_amt_nonneg CHECK (tax_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 2. Invoices: tax_rate + notes/terms/updated_at ----------

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS tax_rate   numeric NOT NULL DEFAULT 0.0875,
  ADD COLUMN IF NOT EXISTS notes      text,
  ADD COLUMN IF NOT EXISTS terms      text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.invoices SET subtotal = 0 WHERE subtotal IS NULL;
UPDATE public.invoices SET tax_applied = 0 WHERE tax_applied IS NULL;
UPDATE public.invoices SET total = 0 WHERE total IS NULL;
UPDATE public.invoices SET paid = false WHERE paid IS NULL;
UPDATE public.invoices SET line_items = '[]'::jsonb WHERE line_items IS NULL;

ALTER TABLE public.invoices
  ALTER COLUMN subtotal    SET NOT NULL,
  ALTER COLUMN tax_applied SET NOT NULL,
  ALTER COLUMN total       SET NOT NULL,
  ALTER COLUMN paid        SET NOT NULL,
  ALTER COLUMN line_items  SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_tax_rate_fraction CHECK (tax_rate >= 0 AND tax_rate <= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_subtotal_nonneg CHECK (subtotal >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_tax_applied_nonneg CHECK (tax_applied >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.invoices ADD CONSTRAINT invoices_total_nonneg CHECK (total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 3. updated_at on remaining tables ----------

ALTER TABLE public.projects  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.contacts  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.receipts  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.photos    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT projects_contract_value_nonneg CHECK (contract_value IS NULL OR contract_value >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 4. Convert CASCADE FKs -> SET NULL on project_id ----------

ALTER TABLE public.estimates DROP CONSTRAINT IF EXISTS estimates_project_id_fkey;
ALTER TABLE public.estimates
  ADD CONSTRAINT estimates_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_project_id_fkey;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_project_id_fkey;
ALTER TABLE public.photos
  ADD CONSTRAINT photos_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_project_id_fkey;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estimates_project ON public.estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_contact ON public.estimates(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project  ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contact  ON public.invoices(contact_id);
CREATE INDEX IF NOT EXISTS idx_invoices_estimate ON public.invoices(estimate_id);
CREATE INDEX IF NOT EXISTS idx_projects_contact  ON public.projects(contact_id);
CREATE INDEX IF NOT EXISTS idx_receipts_project  ON public.receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_project    ON public.photos(project_id);

-- ---------- 5. Ownership guard ----------

CREATE OR REPLACE FUNCTION public.assert_owns(_table regclass, _id uuid, _user uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  IF _id IS NULL THEN RETURN; END IF;
  EXECUTE format('SELECT user_id FROM %s WHERE id = $1', _table)
    INTO _owner USING _id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'Referenced % row % not found', _table, _id USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF _owner <> _user THEN
    RAISE EXCEPTION 'Cross-user reference in % to row % not allowed', _table, _id USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_estimates_assert_owns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_owns('public.projects', NEW.project_id, NEW.user_id);
  PERFORM public.assert_owns('public.contacts', NEW.contact_id, NEW.user_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_invoices_assert_owns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_owns('public.projects',  NEW.project_id,  NEW.user_id);
  PERFORM public.assert_owns('public.contacts',  NEW.contact_id,  NEW.user_id);
  PERFORM public.assert_owns('public.estimates', NEW.estimate_id, NEW.user_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_projects_assert_owns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_owns('public.contacts', NEW.contact_id, NEW.user_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_project_child_assert_owns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_owns('public.projects', NEW.project_id, NEW.user_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS estimates_assert_owns ON public.estimates;
CREATE TRIGGER estimates_assert_owns BEFORE INSERT OR UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.tg_estimates_assert_owns();

DROP TRIGGER IF EXISTS invoices_assert_owns ON public.invoices;
CREATE TRIGGER invoices_assert_owns BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_invoices_assert_owns();

DROP TRIGGER IF EXISTS projects_assert_owns ON public.projects;
CREATE TRIGGER projects_assert_owns BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.tg_projects_assert_owns();

DROP TRIGGER IF EXISTS receipts_assert_owns ON public.receipts;
CREATE TRIGGER receipts_assert_owns BEFORE INSERT OR UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.tg_project_child_assert_owns();

DROP TRIGGER IF EXISTS documents_assert_owns ON public.documents;
CREATE TRIGGER documents_assert_owns BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.tg_project_child_assert_owns();

DROP TRIGGER IF EXISTS photos_assert_owns ON public.photos;
CREATE TRIGGER photos_assert_owns BEFORE INSERT OR UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.tg_project_child_assert_owns();

-- ---------- 6. updated_at triggers ----------

DROP TRIGGER IF EXISTS trg_estimates_updated_at ON public.estimates;
CREATE TRIGGER trg_estimates_updated_at BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON public.invoices;
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_contacts_updated_at ON public.contacts;
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_receipts_updated_at ON public.receipts;
CREATE TRIGGER trg_receipts_updated_at BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_photos_updated_at ON public.photos;
CREATE TRIGGER trg_photos_updated_at BEFORE UPDATE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_documents_updated_at ON public.documents;
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 7. Roles ----------

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- 8. Tighten RLS roles: public -> authenticated ----------

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('contacts','documents','estimates','invoices','photos','projects','receipts','systems')
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------- 9. Storage policies for of-photos ----------

DROP POLICY IF EXISTS "of-photos public read"        ON storage.objects;
DROP POLICY IF EXISTS "of-photos auth insert"        ON storage.objects;
DROP POLICY IF EXISTS "of-photos auth update"        ON storage.objects;
DROP POLICY IF EXISTS "of-photos auth delete"        ON storage.objects;
DROP POLICY IF EXISTS "of-photos folder owner read"  ON storage.objects;
DROP POLICY IF EXISTS "of-photos folder owner insert" ON storage.objects;
DROP POLICY IF EXISTS "of-photos folder owner update" ON storage.objects;
DROP POLICY IF EXISTS "of-photos folder owner delete" ON storage.objects;

CREATE POLICY "of-photos folder owner read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'of-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "of-photos folder owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'of-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "of-photos folder owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'of-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "of-photos folder owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'of-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

UPDATE storage.buckets SET public = false WHERE id = 'of-photos';
