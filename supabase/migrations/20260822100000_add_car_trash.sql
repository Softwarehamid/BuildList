/*
  # Add a 30-day trash for car builds

  Deleted builds remain available for restoration until they are permanently
  removed after 30 days.
*/

ALTER TABLE public.cars
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS cars_deleted_at_idx
ON public.cars (deleted_at);