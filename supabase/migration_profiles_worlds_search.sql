-- Migration: Profil-Personalisierung, Welt-Personalisierung, Benutzername-Login,
-- Nutzer-/Welt-Suche mit Folgen, Gruppenchat-Erweiterung.
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

-- ---------------------------------------------------------------------------
-- Profile: Spitzname, Profilbild, eindeutiger Benutzername
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists avatar_url text;

create unique index if not exists profiles_username_unique_idx on public.profiles (lower(username));

create or replace function public.username_available(p_username text, p_exclude_id uuid default null)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(p_username)
    and (p_exclude_id is null or id <> p_exclude_id)
  );
$$;

grant execute on function public.username_available(text, uuid) to anon, authenticated;

create or replace function public.get_email_for_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
  return v_email;
end;
$$;

grant execute on function public.get_email_for_username(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Welten: Titelbild + Bearbeiten-Recht + weltweite Durchsuchbarkeit
-- ---------------------------------------------------------------------------
alter table public.worlds add column if not exists cover_image_url text;

drop policy if exists "worlds_select_member" on public.worlds;
drop policy if exists "worlds_select_all" on public.worlds;
create policy "worlds_select_all" on public.worlds
  for select to authenticated using (true);

drop policy if exists "worlds_update_own" on public.worlds;
create policy "worlds_update_own" on public.worlds
  for update to authenticated using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Welten folgen (ohne Mitglied zu sein), um ihre Feed-Beiträge zu sehen
-- ---------------------------------------------------------------------------
create table if not exists public.world_follows (
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

alter table public.world_follows enable row level security;

drop policy if exists "world_follows_own" on public.world_follows;
create policy "world_follows_own" on public.world_follows
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "posts_select_followed_world" on public.posts;
create policy "posts_select_followed_world" on public.posts
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      join public.world_follows wf on wf.world_id = c.world_id
      where c.id = posts.character_id and wf.user_id = auth.uid()
    )
  );

drop policy if exists "comments_select_followed_world" on public.comments;
create policy "comments_select_followed_world" on public.comments
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      join public.characters pc on pc.id = p.character_id
      join public.world_follows wf on wf.world_id = pc.world_id
      where p.id = comments.post_id and wf.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Gruppenchats: Teilnehmer nachträglich hinzufügen können (Chat aktualisierbar)
-- ---------------------------------------------------------------------------
drop policy if exists "chats_update_participant" on public.chats;
create policy "chats_update_participant" on public.chats
  for update to authenticated using (public.is_chat_participant(id) or created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Welt-Titelbilder (Supabase Storage)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('world-covers', 'world-covers', true, 10485760)
on conflict (id) do nothing;

drop policy if exists "world_covers_public_read" on storage.objects;
create policy "world_covers_public_read" on storage.objects
  for select using (bucket_id = 'world-covers');

drop policy if exists "world_covers_authenticated_insert" on storage.objects;
create policy "world_covers_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'world-covers');

drop policy if exists "world_covers_authenticated_update" on storage.objects;
create policy "world_covers_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id = 'world-covers');

drop policy if exists "world_covers_authenticated_delete" on storage.objects;
create policy "world_covers_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'world-covers');
