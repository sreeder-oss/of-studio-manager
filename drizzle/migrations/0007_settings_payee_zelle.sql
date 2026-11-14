ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS payee_name text NOT NULL DEFAULT 'Shawn Reeder';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS zelle_contact text;