-- Wiki: Seitenarten (Ort, Spezies, ...) als Daten pro Welt. Alle Mitglieder dürfen eigene anlegen und bearbeiten;
-- löschen dürfen die Ersteller:in und die Welt-Besitzer:in (die mitgelieferten Arten gehören der Welt-Besitzer:in).
create table if not exists public.wiki_types (
  world_id uuid not null references public.worlds (id) on delete cascade,
  id text not null check (id ~ '^[a-z0-9_]{1,40}$'),
  label text not null check (char_length(label) between 1 and 40),
  plural text not null check (char_length(plural) between 1 and 60),
  icon text not null default 'file-text' check (char_length(icon) <= 40),
  color text check (color is null or color in ('rose','peach','gold','sage','teal','sky','slate','plum','gray')),
  hint text not null default '' check (char_length(hint) <= 120),
  fields text[] not null default '{}' check (cardinality(fields) <= 20),
  outline text[] not null default '{}' check (cardinality(outline) <= 20),
  portrait boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (world_id, id)
);

-- Der feste Katalog an Seitenarten gilt nicht mehr.
alter table public.wiki_pages drop constraint if exists wiki_pages_page_type_check;
alter table public.wiki_pages add constraint wiki_pages_page_type_check
  check (page_type is null or page_type ~ '^[a-z0-9_]{1,40}$');

alter table public.wiki_types enable row level security;

drop policy if exists "wiki_types_select_member" on public.wiki_types;
create policy "wiki_types_select_member" on public.wiki_types
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "wiki_types_insert_member" on public.wiki_types;
create policy "wiki_types_insert_member" on public.wiki_types
  for insert to authenticated with check (public.is_world_member(world_id) and created_by = auth.uid());

drop policy if exists "wiki_types_update_member" on public.wiki_types;
create policy "wiki_types_update_member" on public.wiki_types
  for update to authenticated
  using (public.is_world_member(world_id))
  with check (public.is_world_member(world_id));

grant select, insert, update on public.wiki_types to authenticated;

-- Mitgelieferte Arten für eine Welt anlegen (nur intern, nicht aufrufbar).
create or replace function public.seed_wiki_types(p_world uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select created_by into v_owner from public.worlds where id = p_world;
  insert into public.wiki_types (world_id, id, label, plural, icon, color, hint, fields, outline, portrait, sort_order, created_by) values
    (p_world, 'ort', 'Ort', 'Orte', 'map-pin', 'sage', 'Städte, Landschaften, Gebäude',
      array['Art des Ortes','Lage','Einwohner','Herrschaft','Gegründet'], array['Beschreibung','Geschichte','Bewohner','Sehenswertes','Gerüchte'], false, 1, v_owner),
    (p_world, 'spezies', 'Spezies / Wesen', 'Spezies und Wesen', 'paw-print', 'peach', 'Völker, Rassen, Kreaturen',
      array['Art','Entstehung','Lebensdauer','Fähigkeiten','Schwäche'], array['Aussehen','Fähigkeiten und Schwächen','Lebensweise','Geschichte','Mythen und Irrtümer'], false, 2, v_owner),
    (p_world, 'organisation', 'Organisation / Haus', 'Organisationen und Häuser', 'users', 'plum', 'Fraktionen, Familien, Gruppen',
      array['Anführer:in','Sitz','Mitglieder','Gegründet','Ziele'], array['Überblick','Geschichte','Aufbau und Ränge','Mitglieder','Ziele und Gegner'], false, 3, v_owner),
    (p_world, 'person', 'Person', 'Personen', 'user', 'sky', 'Figuren der Welt, die keine Spielfigur sind',
      array['Alter','Beruf','Wohnort','Familie'], array['Wer ist die Person?','Lebensweg','Beziehungen','Geheimnisse'], true, 4, v_owner),
    (p_world, 'ereignis', 'Ereignis', 'Ereignisse', 'calendar-days', 'rose', 'Schlachten, Feste, Wendepunkte',
      array['Datum','Ort','Beteiligte','Folgen'], array['Was geschah?','Vorgeschichte','Ablauf','Folgen'], false, 5, v_owner),
    (p_world, 'mythos', 'Mythos', 'Mythen', 'scroll-text', 'gold', 'Legenden, Religionen, Bräuche',
      array['Herkunft','Verbreitung','Wahrheitsgehalt'], array['Die Erzählung','Ursprung','Deutungen','Was wirklich dahintersteckt'], false, 6, v_owner),
    (p_world, 'gegenstand', 'Gegenstand', 'Gegenstände', 'gem', 'slate', 'Waffen, Artefakte, Besonderes',
      array['Art','Besitzer:in','Herkunft','Wirkung'], array['Beschreibung','Geschichte','Kräfte und Preis','Aufenthaltsort'], false, 7, v_owner)
  on conflict (world_id, id) do nothing;
end;
$$;

revoke all on function public.seed_wiki_types(uuid) from public, anon, authenticated;

create or replace function public.seed_wiki_types_for_new_world()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_wiki_types(new.id);
  return new;
end;
$$;

revoke all on function public.seed_wiki_types_for_new_world() from public, anon, authenticated;

drop trigger if exists wiki_types_seed_trg on public.worlds;
create trigger wiki_types_seed_trg after insert on public.worlds
  for each row execute procedure public.seed_wiki_types_for_new_world();

-- Bestehende Welten bekommen die mitgelieferten Arten.
select public.seed_wiki_types(id) from public.worlds;

-- Art löschen: Seiten dieser Art verlieren nur ihre Art (Inhalt bleibt). Ersteller:in oder Welt-Besitzer:in.
create or replace function public.delete_wiki_type(p_world uuid, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_owner uuid;
begin
  select created_by into v_creator from public.wiki_types where world_id = p_world and id = p_id;
  if not found then
    raise exception 'Seitenart nicht gefunden';
  end if;
  select created_by into v_owner from public.worlds where id = p_world;
  if not (v_creator = auth.uid() or v_owner = auth.uid()) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.wiki_pages set page_type = null where world_id = p_world and page_type = p_id;
  delete from public.wiki_types where world_id = p_world and id = p_id;
end;
$$;

revoke all on function public.delete_wiki_type(uuid, text) from public, anon;
grant execute on function public.delete_wiki_type(uuid, text) to authenticated;

notify pgrst, 'reload schema';
