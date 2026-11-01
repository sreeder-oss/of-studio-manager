ALTER TABLE public.estimates
  ADD COLUMN model_used text,
  ADD COLUMN prompt text;
COMMENT ON COLUMN public.estimates.prompt IS 'Raw user prompt that produced an AI-generated estimate. Internal only; never rendered in client documents.';