-- Öffentliche Welten und Übungswelt (Teil 1: Kennzeichen und Übersicht)
alter table public.worlds add column if not exists is_public boolean not null default false;
alter table public.worlds add column if not exists is_demo boolean not null default false;

-- Höchstens eine Übungswelt
create unique index if not exists worlds_one_demo_idx on public.worlds (is_demo) where is_demo;

-- Übersicht der öffentlichen Welten (und der Übungswelt) mit Zahlen; Nicht-Mitglieder dürfen sonst nichts zählen.
create or replace function public.public_worlds_overview()
returns table (
  id uuid,
  name text,
  description text,
  cover_image_url text,
  is_demo boolean,
  member_count bigint,
  scene_count bigint,
  last_activity timestamptz,
  is_member boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    w.name,
    w.description,
    w.cover_image_url,
    w.is_demo,
    (select count(*) from public.world_members m where m.world_id = w.id) as member_count,
    (select count(*) from public.story_posts s where s.world_id = w.id and not s.is_private) as scene_count,
    greatest(
      w.created_at,
      (select max(s.created_at) from public.story_posts s where s.world_id = w.id and not s.is_private),
      (select max(e.created_at) from public.story_entries e join public.story_posts s on s.id = e.story_post_id where s.world_id = w.id and not s.is_private)
    ) as last_activity,
    exists (select 1 from public.world_members m where m.world_id = w.id and m.user_id = auth.uid()) as is_member
  from public.worlds w
  where w.is_public or w.is_demo
  order by w.is_demo desc, last_activity desc nulls last;
$$;

revoke execute on function public.public_worlds_overview() from public, anon;
grant execute on function public.public_worlds_overview() to authenticated;

notify pgrst, 'reload schema';
