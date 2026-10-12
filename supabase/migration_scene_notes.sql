-- Notizen der Spielleitung zu einer Szene: nur Besitzer:in und Admins der Welt sehen und ändern sie
create table if not exists public.scene_notes (
  story_post_id uuid primary key references public.story_posts (id) on delete cascade,
  world_id uuid not null references public.worlds (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists scene_notes_world_idx on public.scene_notes (world_id);

alter table public.scene_notes enable row level security;

drop policy if exists scene_notes_select on public.scene_notes;
create policy scene_notes_select on public.scene_notes
  for select to authenticated using (public.is_world_admin(world_id));

drop policy if exists scene_notes_insert on public.scene_notes;
create policy scene_notes_insert on public.scene_notes
  for insert to authenticated with check (public.is_world_admin(world_id) and updated_by = (select auth.uid()));

drop policy if exists scene_notes_update on public.scene_notes;
create policy scene_notes_update on public.scene_notes
  for update to authenticated using (public.is_world_admin(world_id)) with check (public.is_world_admin(world_id));

drop policy if exists scene_notes_delete on public.scene_notes;
create policy scene_notes_delete on public.scene_notes
  for delete to authenticated using (public.is_world_admin(world_id));
