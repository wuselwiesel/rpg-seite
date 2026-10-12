-- Rechte-Tabelle je Welt: wer darf Wiki-Seiten anlegen/bearbeiten, Struktur ändern, Szenen starten, Handlungsstränge anlegen.
-- Werte je Schlüssel: 'all' (alle Mitglieder), 'own' (nur Eigenes, nur wiki_edit), 'admins'. Fehlt ein Schlüssel, gilt 'all'
-- (bestehende Welten bleiben offen). Admins (Besitzer:in, ernannte) dürfen immer.
alter table public.worlds add column if not exists permissions jsonb not null default '{}'::jsonb;

create or replace function public.world_allows(p_world uuid, p_key text, p_owner uuid default null)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_world_admin(p_world)
    or (
      public.is_world_member(p_world)
      and coalesce((
        select case coalesce(w.permissions ->> p_key, 'all')
          when 'all' then true
          when 'own' then p_owner is not null and p_owner = auth.uid()
          else false
        end
        from public.worlds w where w.id = p_world
      ), false)
    );
$$;
revoke execute on function public.world_allows(uuid, text, uuid) from anon, public;
grant execute on function public.world_allows(uuid, text, uuid) to authenticated;

-- Wiki-Seiten
alter policy wiki_pages_insert_member on public.wiki_pages
  with check (created_by = (select auth.uid()) and public.world_allows(world_id, 'wiki_create'));
alter policy wiki_pages_update_member on public.wiki_pages
  using (public.world_allows(world_id, 'wiki_edit', created_by))
  with check (public.world_allows(world_id, 'wiki_edit', created_by));

-- Ordner, Karten, Kartenmarker, Typen
alter policy wiki_folders_insert_member on public.wiki_folders
  with check (created_by = (select auth.uid()) and public.world_allows(world_id, 'wiki_structure'));
alter policy wiki_folders_update_member on public.wiki_folders
  using (public.world_allows(world_id, 'wiki_structure')) with check (public.world_allows(world_id, 'wiki_structure'));
alter policy wiki_maps_insert_member on public.wiki_maps
  with check (created_by = (select auth.uid()) and public.world_allows(world_id, 'wiki_structure'));
alter policy wiki_maps_update_member on public.wiki_maps
  using (public.world_allows(world_id, 'wiki_structure')) with check (public.world_allows(world_id, 'wiki_structure'));
alter policy wiki_types_insert_member on public.wiki_types
  with check (public.world_allows(world_id, 'wiki_structure') and created_by = (select auth.uid()));
alter policy wiki_types_update_member on public.wiki_types
  using (public.world_allows(world_id, 'wiki_structure')) with check (public.world_allows(world_id, 'wiki_structure'));
alter policy wiki_map_pins_insert_member on public.wiki_map_pins
  with check (created_by = (select auth.uid()) and exists (
    select 1 from public.wiki_maps m where m.id = wiki_map_pins.map_id and public.world_allows(m.world_id, 'wiki_structure')));
alter policy wiki_map_pins_update_member on public.wiki_map_pins
  using (exists (select 1 from public.wiki_maps m where m.id = wiki_map_pins.map_id and public.world_allows(m.world_id, 'wiki_structure')))
  with check (exists (select 1 from public.wiki_maps m where m.id = wiki_map_pins.map_id and public.world_allows(m.world_id, 'wiki_structure')));
alter policy wiki_map_pins_delete_member on public.wiki_map_pins
  using (exists (select 1 from public.wiki_maps m where m.id = wiki_map_pins.map_id and public.world_allows(m.world_id, 'wiki_structure')));

-- Szenen und Handlungsstränge
alter policy story_posts_insert_member on public.story_posts
  with check (
    exists (select 1 from public.characters c where c.id = story_posts.character_id and c.owner_id = (select auth.uid()) and c.world_id = story_posts.world_id)
    and public.world_allows(world_id, 'story_create')
  );
alter policy story_arcs_insert_member on public.story_arcs
  with check (created_by = (select auth.uid()) and public.world_allows(world_id, 'arc_create'));

-- Unterseiten rücken beim Löschen hoch, auch wenn sie anderen gehören (läuft mit Rechten der Funktion).
create or replace function public.wiki_page_reparent_children()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.wiki_pages set parent_page_id = old.parent_page_id where parent_page_id = old.id;
  return old;
end;
$$;
revoke execute on function public.wiki_page_reparent_children() from anon, authenticated, public;

-- Löschen: Admins immer, sonst nur Eigenes und nur, wenn die Welt es der Person erlaubt.
alter policy wiki_pages_delete_own_or_world_owner on public.wiki_pages
  using (public.is_world_admin(world_id) or (created_by = (select auth.uid()) and public.world_allows(world_id, 'wiki_edit', created_by)));
alter policy wiki_folders_delete_own_or_world_owner on public.wiki_folders
  using (public.is_world_admin(world_id) or (created_by = (select auth.uid()) and public.world_allows(world_id, 'wiki_structure')));
alter policy wiki_maps_delete_own_or_world_owner on public.wiki_maps
  using (public.is_world_admin(world_id) or (created_by = (select auth.uid()) and public.world_allows(world_id, 'wiki_structure')));

create or replace function public.delete_wiki_folder(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_parent uuid;
  v_world uuid;
  v_creator uuid;
begin
  select parent_id, world_id, created_by into v_parent, v_world, v_creator from public.wiki_folders where id = p_id;
  if not found then
    raise exception 'Ordner nicht gefunden';
  end if;
  if not (public.is_world_admin(v_world) or (v_creator = auth.uid() and public.world_allows(v_world, 'wiki_structure'))) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.wiki_folders set parent_id = v_parent where parent_id = p_id;
  update public.wiki_pages set folder_id = v_parent where folder_id = p_id;
  delete from public.wiki_folders where id = p_id;
end;
$$;

create or replace function public.delete_wiki_type(p_world uuid, p_id text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_creator uuid;
begin
  select created_by into v_creator from public.wiki_types where world_id = p_world and id = p_id;
  if not found then
    raise exception 'Seitenart nicht gefunden';
  end if;
  if not (public.is_world_admin(p_world) or (v_creator = auth.uid() and public.world_allows(p_world, 'wiki_structure'))) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.wiki_pages set page_type = null where world_id = p_world and page_type = p_id;
  delete from public.wiki_types where world_id = p_world and id = p_id;
end;
$$;
