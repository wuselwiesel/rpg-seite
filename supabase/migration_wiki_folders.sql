-- Wiki: frei verschachtelbare Ordner, Unterseiten, Kurztext, Galerie und Steckbrief.
-- Bearbeiten darf jedes Mitglied der Welt; Ordner und Seiten löschen nur Ersteller:in und Welt-Besitzer:in.

create table if not exists public.wiki_folders (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  parent_id uuid references public.wiki_folders (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists wiki_folders_world_idx on public.wiki_folders (world_id);
create index if not exists wiki_folders_parent_idx on public.wiki_folders (parent_id);

alter table public.wiki_pages add column if not exists folder_id uuid references public.wiki_folders (id) on delete set null;
alter table public.wiki_pages add column if not exists parent_page_id uuid references public.wiki_pages (id) on delete set null;
alter table public.wiki_pages add column if not exists lead text check (lead is null or char_length(lead) <= 300);
alter table public.wiki_pages add column if not exists gallery text[] not null default '{}' check (cardinality(gallery) <= 24);
alter table public.wiki_pages add column if not exists fields jsonb not null default '[]'::jsonb
  check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) <= 20);

create index if not exists wiki_pages_folder_idx on public.wiki_pages (folder_id);
create index if not exists wiki_pages_parent_idx on public.wiki_pages (parent_page_id);

-- Ordner: nicht in sich selbst oder einem eigenen Unterordner ablegen; Elternordner muss aus derselben Welt sein.
create or replace function public.wiki_folder_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'Ein Ordner kann nicht in sich selbst liegen.';
  end if;
  if not exists (select 1 from public.wiki_folders p where p.id = new.parent_id and p.world_id = new.world_id) then
    raise exception 'Der Elternordner gehört zu einer anderen Welt.';
  end if;
  if exists (
    with recursive up as (
      select f.id, f.parent_id from public.wiki_folders f where f.id = new.parent_id
      union all
      select f.id, f.parent_id from public.wiki_folders f join up on f.id = up.parent_id
    )
    select 1 from up where up.id = new.id
  ) then
    raise exception 'Ein Ordner kann nicht in einem seiner Unterordner liegen.';
  end if;
  return new;
end;
$$;

drop trigger if exists wiki_folder_check_trg on public.wiki_folders;
create trigger wiki_folder_check_trg before insert or update of parent_id on public.wiki_folders
  for each row execute procedure public.wiki_folder_check();

-- Seiten: Ordner und Oberseite müssen aus derselben Welt sein; keine Kreise bei Unterseiten.
create or replace function public.wiki_page_check()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.folder_id is not null
     and not exists (select 1 from public.wiki_folders f where f.id = new.folder_id and f.world_id = new.world_id) then
    raise exception 'Der Ordner gehört zu einer anderen Welt.';
  end if;
  if new.parent_page_id is null then
    return new;
  end if;
  if new.parent_page_id = new.id then
    raise exception 'Eine Seite kann nicht ihre eigene Oberseite sein.';
  end if;
  if not exists (select 1 from public.wiki_pages p where p.id = new.parent_page_id and p.world_id = new.world_id) then
    raise exception 'Die Oberseite gehört zu einer anderen Welt.';
  end if;
  if exists (
    with recursive up as (
      select p.id, p.parent_page_id from public.wiki_pages p where p.id = new.parent_page_id
      union all
      select p.id, p.parent_page_id from public.wiki_pages p join up on p.id = up.parent_page_id
    )
    select 1 from up where up.id = new.id
  ) then
    raise exception 'Eine Seite kann nicht unter einer ihrer Unterseiten liegen.';
  end if;
  return new;
end;
$$;

drop trigger if exists wiki_page_check_trg on public.wiki_pages;
create trigger wiki_page_check_trg before insert or update of folder_id, parent_page_id on public.wiki_pages
  for each row execute procedure public.wiki_page_check();

-- Wird eine Seite gelöscht, rücken ihre Unterseiten eine Ebene hoch.
create or replace function public.wiki_page_reparent_children()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update public.wiki_pages set parent_page_id = old.parent_page_id where parent_page_id = old.id;
  return old;
end;
$$;

drop trigger if exists wiki_page_reparent_trg on public.wiki_pages;
create trigger wiki_page_reparent_trg before delete on public.wiki_pages
  for each row execute procedure public.wiki_page_reparent_children();

alter table public.wiki_folders enable row level security;

drop policy if exists "wiki_folders_select_member" on public.wiki_folders;
create policy "wiki_folders_select_member" on public.wiki_folders
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "wiki_folders_insert_member" on public.wiki_folders;
create policy "wiki_folders_insert_member" on public.wiki_folders
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

drop policy if exists "wiki_folders_update_member" on public.wiki_folders;
create policy "wiki_folders_update_member" on public.wiki_folders
  for update to authenticated
  using (public.is_world_member(world_id))
  with check (public.is_world_member(world_id));

drop policy if exists "wiki_folders_delete_own_or_world_owner" on public.wiki_folders;
create policy "wiki_folders_delete_own_or_world_owner" on public.wiki_folders
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

-- Ordner löschen: Unterordner und Seiten rücken eine Ebene hoch (nichts geht verloren).
create or replace function public.delete_wiki_folder(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
  v_world uuid;
  v_creator uuid;
begin
  select parent_id, world_id, created_by into v_parent, v_world, v_creator from public.wiki_folders where id = p_id;
  if not found then
    raise exception 'Ordner nicht gefunden';
  end if;
  if not (
    v_creator = auth.uid()
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.wiki_folders set parent_id = v_parent where parent_id = p_id;
  update public.wiki_pages set folder_id = v_parent where folder_id = p_id;
  delete from public.wiki_folders where id = p_id;
end;
$$;

grant execute on function public.delete_wiki_folder(uuid) to authenticated;

-- Bestehende Kategorien werden zu Ordnern (pro Welt, nur wenn es Seiten dazu gibt) und die Seiten dort einsortiert.
insert into public.wiki_folders (world_id, name, created_by)
select distinct p.world_id,
  case p.category when 'ort' then 'Orte' when 'npc' then 'NPCs' when 'fraktion' then 'Fraktionen' else 'Sonstiges' end,
  (select w.created_by from public.worlds w where w.id = p.world_id)
from public.wiki_pages p
where p.folder_id is null
  and not exists (
    select 1 from public.wiki_folders f
    where f.world_id = p.world_id and f.parent_id is null
      and f.name = case p.category when 'ort' then 'Orte' when 'npc' then 'NPCs' when 'fraktion' then 'Fraktionen' else 'Sonstiges' end
  );

update public.wiki_pages p
set folder_id = f.id
from public.wiki_folders f
where p.folder_id is null
  and f.world_id = p.world_id
  and f.parent_id is null
  and f.name = case p.category when 'ort' then 'Orte' when 'npc' then 'NPCs' when 'fraktion' then 'Fraktionen' else 'Sonstiges' end;

notify pgrst, 'reload schema';
