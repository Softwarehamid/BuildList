/*
  # Add custom car groups

  Cars have one group by default in the UI. The membership table also supports
  multiple groups when the user enables that option in Settings.
*/

CREATE TABLE IF NOT EXISTS public.car_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.car_group_members (
  group_id uuid NOT NULL REFERENCES public.car_groups(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, car_id)
);

ALTER TABLE public.car_groups
ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS car_groups_user_id_idx
ON public.car_groups (user_id, display_order);

CREATE INDEX IF NOT EXISTS car_group_members_car_id_idx
ON public.car_group_members (car_id);

ALTER TABLE public.car_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own car groups"
  ON public.car_groups FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own car group members"
  ON public.car_group_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.car_groups g
      WHERE g.id = car_group_members.group_id AND g.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.cars c
      WHERE c.id = car_group_members.car_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.car_groups g
      WHERE g.id = car_group_members.group_id AND g.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.cars c
      WHERE c.id = car_group_members.car_id AND c.user_id = auth.uid()
    )
  );