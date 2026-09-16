ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS cars_one_favorite_per_user_idx
  ON public.cars (user_id)
  WHERE is_favorite = true AND user_id IS NOT NULL;