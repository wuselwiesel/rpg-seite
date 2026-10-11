-- Papierkorb: gelöschte Nachrichten (Szenen) und Beziehungen werden aufgehoben und lassen sich wiederherstellen.
create table if not exists public.trash_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('story_entry', 'relationship')),
  world_id uuid references public.worlds (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  deleted_by uuid,
  label text not null,
  payload jsonb not null,
  deleted_at timestamptz not null default now()
);
create index if not exists trash_items_owner_idx on public.trash_items (owner_id, deleted_at desc);
alter table public.trash_items enable row level security;

drop policy if exists "trash_items_select" on public.trash_items;
create policy "trash_items_select" on public.trash_items
  for select to authenticated using (owner_id = auth.uid() or deleted_by = auth.uid());
drop policy if exists "trash_items_delete" on public.trash_items;
create policy "trash_items_delete" on public.trash_items
  for delete to authenticated using (owner_id = auth.uid() or deleted_by = auth.uid());

create or replace function public.trash_story_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  w uuid;
begin
  -- Wird die ganze Szene gelöscht, ist sie nicht mehr da: dann nichts aufheben
  select world_id into w from public.story_posts where id = old.story_post_id;
  if w is null then return old; end if;
  select owner_id into owner from public.characters where id = old.character_id;
  if owner is null then return old; end if;
  insert into public.trash_items (kind, world_id, owner_id, deleted_by, label, payload)
  values ('story_entry', w, owner, auth.uid(), left(regexp_replace(coalesce(old.content, ''), '<[^>]+>', ' ', 'g'), 120), to_jsonb(old));
  return old;
end;
$$;
drop trigger if exists story_entries_trash on public.story_entries;
create trigger story_entries_trash before delete on public.story_entries
  for each row execute procedure public.trash_story_entry();

create or replace function public.trash_relationship()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  na text;
  nb text;
begin
  if not exists (select 1 from public.worlds where id = old.world_id) then return old; end if;
  select name into na from public.characters where id = old.character_a_id;
  select name into nb from public.characters where id = old.character_b_id;
  if na is null or nb is null then return old; end if;
  insert into public.trash_items (kind, world_id, owner_id, deleted_by, label, payload)
  values ('relationship', old.world_id, old.created_by, auth.uid(), na || ' · ' || old.type || ' · ' || nb, to_jsonb(old));
  return old;
end;
$$;
drop trigger if exists character_relationships_trash on public.character_relationships;
create trigger character_relationships_trash before delete on public.character_relationships
  for each row execute procedure public.trash_relationship();

create or replace function public.restore_trash_item(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  t record;
begin
  select * into t from public.trash_items where id = p_id and (owner_id = auth.uid() or deleted_by = auth.uid());
  if not found then return 'Nicht gefunden.'; end if;

  if t.kind = 'story_entry' then
    if not exists (select 1 from public.story_posts where id = (t.payload ->> 'story_post_id')::uuid) then
      return 'Die Szene gibt es nicht mehr.';
    end if;
    if exists (select 1 from public.story_entries where id = (t.payload ->> 'id')::uuid) then
      delete from public.trash_items where id = p_id;
      return 'ok';
    end if;
    insert into public.story_entries select * from jsonb_populate_record(null::public.story_entries, t.payload);
  elsif t.kind = 'relationship' then
    if exists (select 1 from public.character_relationships where id = (t.payload ->> 'id')::uuid) then
      delete from public.trash_items where id = p_id;
      return 'ok';
    end if;
    if not exists (select 1 from public.characters where id = (t.payload ->> 'character_a_id')::uuid)
       or not exists (select 1 from public.characters where id = (t.payload ->> 'character_b_id')::uuid) then
      return 'Eine der Figuren gibt es nicht mehr.';
    end if;
    insert into public.character_relationships select * from jsonb_populate_record(null::public.character_relationships, t.payload);
    perform public.sync_relationship_sheets((t.payload ->> 'id')::uuid);
  end if;

  delete from public.trash_items where id = p_id;
  return 'ok';
end;
$$;
revoke all on function public.restore_trash_item(uuid) from public, anon;
grant execute on function public.restore_trash_item(uuid) to authenticated;
