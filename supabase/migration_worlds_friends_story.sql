-- Migration: Welten, Freundschaften, Story-Sektion
-- Einmalig auf dem bestehenden (bereits laufenden) Supabase-Projekt ausführen.

-- ---------------------------------------------------------------------------
-- 1. Freundschaften
-- ---------------------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

create policy "friendships_select_own" on public.friendships
  for select to authenticated using (auth.uid() in (requester_id, addressee_id));

create policy "friendships_insert_own" on public.friendships
  for insert to authenticated with check (requester_id = auth.uid());

create policy "friendships_update_addressee" on public.friendships
  for update to authenticated using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());

create policy "friendships_delete_own" on public.friendships
  for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create function public.is_friend_of(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
    and ((f.requester_id = auth.uid() and f.addressee_id = _user_id)
      or (f.requester_id = _user_id and f.addressee_id = auth.uid()))
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Welten & Mitgliedschaft
-- ---------------------------------------------------------------------------
create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.world_members (
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

create function public.is_world_member(_world_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.world_members wm
    where wm.world_id = _world_id and wm.user_id = auth.uid()
  );
$$;

alter table public.worlds enable row level security;
alter table public.world_members enable row level security;

create policy "worlds_select_member" on public.worlds
  for select to authenticated using (public.is_world_member(id) or created_by = auth.uid());

create policy "worlds_insert_own" on public.worlds
  for insert to authenticated with check (created_by = auth.uid());

create policy "world_members_select_member" on public.world_members
  for select to authenticated using (public.is_world_member(world_id));

create policy "world_members_insert" on public.world_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or (
      exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
      and public.is_friend_of(user_id)
    )
  );

create policy "world_members_delete_own" on public.world_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Bestandsdaten migrieren: eine Standardwelt für alle existierenden
--    Profile/Charaktere anlegen, damit nichts verloren geht.
-- ---------------------------------------------------------------------------
do $$
declare
  default_world_id uuid;
  first_user_id uuid;
begin
  select id into first_user_id from public.profiles order by created_at asc limit 1;

  if first_user_id is not null then
    insert into public.worlds (name, description, created_by)
    values ('Erste Welt', 'Automatisch angelegt beim Umstieg auf Welten.', first_user_id)
    returning id into default_world_id;

    insert into public.world_members (world_id, user_id)
    select default_world_id, id from public.profiles
    on conflict do nothing;

    -- world_id-Spalte erst mal nullable hinzufügen, um Bestandsdaten zu befüllen
    alter table public.characters add column world_id uuid references public.worlds (id) on delete cascade;
    update public.characters set world_id = default_world_id where world_id is null;
    alter table public.characters alter column world_id set not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Characters-Policies auf Weltmitgliedschaft umstellen
-- ---------------------------------------------------------------------------
drop policy "characters_select_all" on public.characters;
drop policy "characters_insert_own" on public.characters;

create policy "characters_select_world_member" on public.characters
  for select to authenticated using (public.is_world_member(world_id));

create policy "characters_insert_own" on public.characters
  for insert to authenticated with check (owner_id = auth.uid() and public.is_world_member(world_id));

-- ---------------------------------------------------------------------------
-- 5. Feed (posts/comments) auf Freundeskreis beschränken
-- ---------------------------------------------------------------------------
drop policy "posts_select_all" on public.posts;

create policy "posts_select_own_or_friends" on public.posts
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and (c.owner_id = auth.uid() or public.is_friend_of(c.owner_id))
    )
  );

drop policy "comments_select_all" on public.comments;
drop policy "comments_insert_own_character" on public.comments;

create policy "comments_select_if_post_visible" on public.comments
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      join public.characters pc on pc.id = p.character_id
      where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
    )
  );

create policy "comments_insert_own_character" on public.comments
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    and exists (
      select 1 from public.posts p
      join public.characters pc on pc.id = p.character_id
      where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Story-Sektion (RPG): mehrere parallele Szenen/Threads pro Welt
-- ---------------------------------------------------------------------------
create table public.story_posts (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.story_entries (
  id uuid primary key default gen_random_uuid(),
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.story_posts enable row level security;
alter table public.story_entries enable row level security;

create policy "story_posts_select_member" on public.story_posts
  for select to authenticated using (public.is_world_member(world_id));

create policy "story_posts_insert_member" on public.story_posts
  for insert to authenticated with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.owner_id = auth.uid() and c.world_id = story_posts.world_id
    )
  );

create policy "story_entries_select_member" on public.story_entries
  for select to authenticated using (
    exists (select 1 from public.story_posts sp where sp.id = story_post_id and public.is_world_member(sp.world_id))
  );

create policy "story_entries_insert_member" on public.story_entries
  for insert to authenticated with check (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = character_id
      where sp.id = story_post_id and c.owner_id = auth.uid() and c.world_id = sp.world_id
    )
  );
