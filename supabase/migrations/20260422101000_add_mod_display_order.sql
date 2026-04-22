alter table public.mods
add column if not exists display_order integer;

with ranked as (
  select id, category_id,
         row_number() over (partition by category_id order by created_at asc, id asc) as rn
  from public.mods
)
update public.mods m
set display_order = ranked.rn
from ranked
where m.id = ranked.id
  and m.display_order is null;

alter table public.mods
alter column display_order set default 1;

update public.mods
set display_order = 1
where display_order is null;

alter table public.mods
alter column display_order set not null;

create index if not exists mods_category_display_order_idx
on public.mods (category_id, display_order);