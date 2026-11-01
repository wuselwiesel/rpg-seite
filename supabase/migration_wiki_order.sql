-- Wiki: eigene Reihenfolge der Seitenleiste (gilt für die ganze Welt).
-- Eine Zeile je Ebene: container = 'root', 'folder:<id>' oder 'page:<id>', ids = Einträge in gewählter Reihenfolge.
-- Was dort fehlt (neu angelegt), steht in der Leiste dahinter, alphabetisch. Ohne Zeilen bleibt alles alphabetisch wie bisher.
create table if not exists public.wiki_order (
  world_id uuid not null references public.worlds (id) on delete cascade,
  container text not null check (char_length(container) <= 60),
  ids uuid[] not null default '{}' check (cardinality(ids) <= 2000),
  updated_at timestamptz not null default now(),
  primary key (world_id, container)
);

alter table public.wiki_order enable row level security;

drop policy if exists "wiki_order_select_member" on public.wiki_order;
create policy "wiki_order_select_member" on public.wiki_order
  for select to authenticated using (public.is_world_member(world_id));

-- Umsortieren ist Struktur: wer Ordner verschieben darf („Struktur ändern“), darf auch die Reihenfolge ändern.
drop policy if exists "wiki_order_insert_structure" on public.wiki_order;
create policy "wiki_order_insert_structure" on public.wiki_order
  for insert to authenticated with check (public.world_allows(world_id, 'wiki_structure'));

drop policy if exists "wiki_order_update_structure" on public.wiki_order;
create policy "wiki_order_update_structure" on public.wiki_order
  for update to authenticated
  using (public.world_allows(world_id, 'wiki_structure'))
  with check (public.world_allows(world_id, 'wiki_structure'));

drop policy if exists "wiki_order_delete_structure" on public.wiki_order;
create policy "wiki_order_delete_structure" on public.wiki_order
  for delete to authenticated using (public.world_allows(world_id, 'wiki_structure'));

grant select, insert, update, delete on public.wiki_order to authenticated;

notify pgrst, 'reload schema';
