-- Szenen ordnen: Ordner je Welt (bis 3 Ebenen, Tiefe prüft die App) und manuelle Reihenfolge der Szenen
create table if not exists public.story_folders (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  parent_id uuid references public.story_folders (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists story_folders_world_idx on public.story_folders (world_id);
create index if not exists story_folders_parent_idx on public.story_folders (parent_id) where parent_id is not null;
create index if not exists story_folders_created_by_idx on public.story_folders (created_by) where created_by is not null;
create unique index if not exists story_folders_name_uidx on public.story_folders (world_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

alter table public.story_folders enable row level security;
drop policy if exists story_folders_select on public.story_folders;
create policy story_folders_select on public.story_folders for select to authenticated using (public.is_world_member(world_id));
drop policy if exists story_folders_insert on public.story_folders;
create policy story_folders_insert on public.story_folders for insert to authenticated
  with check (public.is_world_member(world_id) and created_by = (select auth.uid()));
drop policy if exists story_folders_update on public.story_folders;
create policy story_folders_update on public.story_folders for update to authenticated
  using (created_by = (select auth.uid()) or public.is_world_admin(world_id))
  with check (created_by = (select auth.uid()) or public.is_world_admin(world_id));
drop policy if exists story_folders_delete on public.story_folders;
create policy story_folders_delete on public.story_folders for delete to authenticated
  using (created_by = (select auth.uid()) or public.is_world_admin(world_id));
revoke all on public.story_folders from anon;
grant select, insert, update, delete on public.story_folders to authenticated;

-- Szene: Ordner und manuelle Reihenfolge innerhalb des Ordners (ohne Wert gilt die Anlegezeit, neueste zuerst)
alter table public.story_posts add column if not exists folder_id uuid references public.story_folders (id) on delete set null;
alter table public.story_posts add column if not exists sort_order integer;
create index if not exists story_posts_folder_idx on public.story_posts (folder_id) where folder_id is not null;
