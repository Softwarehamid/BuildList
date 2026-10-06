ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

CREATE INDEX IF NOT EXISTS cars_hidden_at_idx
  ON public.cars (hidden_at)
  WHERE hidden_at IS NOT NULL;
