/*
  # Add per-user ownership and legacy data claim

  This migration introduces account ownership for car builds and secures data by user.
  Existing rows without an owner can be claimed once after sign-in using:

    select * from public.claim_my_legacy_builds();
*/

alter table public.cars
add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists cars_user_id_idx
on public.cars (user_id);

alter table public.cars
alter column user_id set default auth.uid();

drop policy if exists "Public can read cars" on public.cars;
drop policy if exists "Public can insert cars" on public.cars;
drop policy if exists "Public can update cars" on public.cars;
drop policy if exists "Public can delete cars" on public.cars;

drop policy if exists "Public can read mod_categories" on public.mod_categories;
drop policy if exists "Public can insert mod_categories" on public.mod_categories;
drop policy if exists "Public can update mod_categories" on public.mod_categories;
drop policy if exists "Public can delete mod_categories" on public.mod_categories;

drop policy if exists "Public can read mods" on public.mods;
drop policy if exists "Public can insert mods" on public.mods;
drop policy if exists "Public can update mods" on public.mods;
drop policy if exists "Public can delete mods" on public.mods;

create policy "Users can read own cars"
  on public.cars for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert own cars"
  on public.cars for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own cars"
  on public.cars for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own cars"
  on public.cars for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Users can read own mod categories"
  on public.mod_categories for select
  to authenticated
  using (
    exists (
      select 1
      from public.cars c
      where c.id = mod_categories.car_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own mod categories"
  on public.mod_categories for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.cars c
      where c.id = mod_categories.car_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can update own mod categories"
  on public.mod_categories for update
  to authenticated
  using (
    exists (
      select 1
      from public.cars c
      where c.id = mod_categories.car_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.cars c
      where c.id = mod_categories.car_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own mod categories"
  on public.mod_categories for delete
  to authenticated
  using (
    exists (
      select 1
      from public.cars c
      where c.id = mod_categories.car_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can read own mods"
  on public.mods for select
  to authenticated
  using (
    exists (
      select 1
      from public.mod_categories mc
      join public.cars c on c.id = mc.car_id
      where mc.id = mods.category_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own mods"
  on public.mods for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.mod_categories mc
      join public.cars c on c.id = mc.car_id
      where mc.id = mods.category_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can update own mods"
  on public.mods for update
  to authenticated
  using (
    exists (
      select 1
      from public.mod_categories mc
      join public.cars c on c.id = mc.car_id
      where mc.id = mods.category_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.mod_categories mc
      join public.cars c on c.id = mc.car_id
      where mc.id = mods.category_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own mods"
  on public.mods for delete
  to authenticated
  using (
    exists (
      select 1
      from public.mod_categories mc
      join public.cars c on c.id = mc.car_id
      where mc.id = mods.category_id
        and c.user_id = auth.uid()
    )
  );

create or replace function public.claim_my_legacy_builds()
returns table(claimed_cars integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  claimed_count integer := 0;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to claim legacy builds';
  end if;

  update public.cars
  set user_id = current_user_id
  where user_id is null;

  get diagnostics claimed_count = row_count;

  return query select claimed_count;
end;
$$;

revoke all on function public.claim_my_legacy_builds() from public;
grant execute on function public.claim_my_legacy_builds() to authenticated;