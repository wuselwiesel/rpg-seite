-- Wiki Runde 4: Karten mit Markierungen (Pins). Ein Pin kann auf eine Wiki-Seite oder auf eine weitere Karte zeigen.
-- Das Kartenbild liegt im Bucket wiki-covers (Pfad maps/...). Mitglieder der Welt dürfen Karten und Pins bearbeiten (wie Wiki-Seiten);
-- Karten löschen dürfen nur, wer sie angelegt hat, und die Welt-Besitzerin.
create table if not exists public.wiki_maps (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  image_url text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wiki_maps_world_idx on public.wiki_maps (world_id);

create table if not exists public.wiki_map_pins (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.wiki_maps (id) on delete cascade,
  x numeric(6, 3) not null check (x between 0 and 100),
  y numeric(6, 3) not null check (y between 0 and 100),
  label text not null check (char_length(label) between 1 and 80),
  icon text check (icon is null or char_length(icon) <= 40),
  page_id uuid references public.wiki_pages (id) on delete set null,
  target_map_id uuid references public.wiki_maps (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wiki_map_pins_map_idx on public.wiki_map_pins (map_id);
create index if not exists wiki_map_pins_page_idx on public.wiki_map_pins (page_id);

-- Pins zeigen nur auf Seiten und Karten derselben Welt.
create or replace function public.wiki_map_pin_check() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.page_id is not null and not exists (
    select 1 from wiki_pages p join wiki_maps m on m.id = new.map_id where p.id = new.page_id and p.world_id = m.world_id
  ) then
    raise exception 'Die Seite gehört nicht zur Welt dieser Karte.';
  end if;
  if new.target_map_id is not null and not exists (
    select 1 from wiki_maps t join wiki_maps m on m.id = new.map_id where t.id = new.target_map_id and t.world_id = m.world_id
  ) then
    raise exception 'Die Zielkarte gehört nicht zur Welt dieser Karte.';
  end if;
  if new.target_map_id = new.map_id then
    raise exception 'Ein Pin kann nicht auf die eigene Karte zeigen.';
  end if;
  return new;
end $$;
drop trigger if exists wiki_map_pin_check on public.wiki_map_pins;
create trigger wiki_map_pin_check before insert or update on public.wiki_map_pins
  for each row execute function public.wiki_map_pin_check();

alter table public.wiki_maps enable row level security;
alter table public.wiki_map_pins enable row level security;

drop policy if exists "wiki_maps_select_member" on public.wiki_maps;
create policy "wiki_maps_select_member" on public.wiki_maps for select using (is_world_member(world_id));
drop policy if exists "wiki_maps_insert_member" on public.wiki_maps;
create policy "wiki_maps_insert_member" on public.wiki_maps for insert with check (created_by = auth.uid() and is_world_member(world_id));
drop policy if exists "wiki_maps_update_member" on public.wiki_maps;
create policy "wiki_maps_update_member" on public.wiki_maps for update using (is_world_member(world_id)) with check (is_world_member(world_id));
drop policy if exists "wiki_maps_delete_own_or_world_owner" on public.wiki_maps;
create policy "wiki_maps_delete_own_or_world_owner" on public.wiki_maps for delete using (
  created_by = auth.uid() or exists (select 1 from worlds w where w.id = wiki_maps.world_id and w.created_by = auth.uid())
);

drop policy if exists "wiki_map_pins_select_member" on public.wiki_map_pins;
create policy "wiki_map_pins_select_member" on public.wiki_map_pins for select using (
  exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id))
);
drop policy if exists "wiki_map_pins_insert_member" on public.wiki_map_pins;
create policy "wiki_map_pins_insert_member" on public.wiki_map_pins for insert with check (
  created_by = auth.uid() and exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id))
);
drop policy if exists "wiki_map_pins_update_member" on public.wiki_map_pins;
create policy "wiki_map_pins_update_member" on public.wiki_map_pins for update
  using (exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id)))
  with check (exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id)));
drop policy if exists "wiki_map_pins_delete_member" on public.wiki_map_pins;
create policy "wiki_map_pins_delete_member" on public.wiki_map_pins for delete using (
  exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id))
);

grant select, insert, update, delete on public.wiki_maps, public.wiki_map_pins to authenticated;

notify pgrst, 'reload schema';
