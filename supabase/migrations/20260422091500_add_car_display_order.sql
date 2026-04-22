alter table public.cars
add column if not exists display_order integer;

with ranked as (
  select id, row_number() over (order by created_at asc, id asc) as rn
  from public.cars
)
update public.cars c
set display_order = ranked.rn
from ranked
where c.id = ranked.id
  and c.display_order is null;

alter table public.cars
alter column display_order set default 1;

update public.cars
set display_order = 1
where display_order is null;

alter table public.cars
alter column display_order set not null;

create index if not exists cars_display_order_idx
on public.cars (display_order);