-- Migration: Story-Arcs - benannte Handlungsstränge, die Story-Posts bündeln
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

create table if not exists public.story_arcs (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.story_arcs enable row level security;

drop policy if exists "story_arcs_select_member" on public.story_arcs;
create policy "story_arcs_select_member" on public.story_arcs
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "story_arcs_insert_member" on public.story_arcs;
create policy "story_arcs_insert_member" on public.story_arcs
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_world_member(world_id)
  );

drop policy if exists "story_arcs_delete_own" on public.story_arcs;
create policy "story_arcs_delete_own" on public.story_arcs
  for delete to authenticated using (created_by = auth.uid());

alter table public.story_posts
  add column if not exists arc_id uuid references public.story_arcs (id) on delete set null;

create index if not exists story_posts_arc_idx on public.story_posts (arc_id);
