ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_applied numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms text;

UPDATE public.invoices SET status = 'draft' WHERE status IS NULL OR status NOT IN ('draft','sent','partial','paid','overdue');

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS balance_due numeric GENERATED ALWAYS AS (total - amount_paid - deposit_applied) STORED;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft','sent','partial','paid','overdue'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_user_invoice_number_key') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_user_invoice_number_key UNIQUE (user_id, invoice_number);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_amounts_nonneg') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_amounts_nonneg CHECK (amount_paid >= 0 AND deposit_applied >= 0 AND tax_amount >= 0);
  END IF;
END $$;