-- Textbasiertes RPG - Datenbankschema
-- Im Supabase SQL Editor des eigenen Projekts ausführen (einmalig, auf einem frischen Projekt).

-- ---------------------------------------------------------------------------
-- Profiles (1 Zeile pro Auth-User, wird automatisch per Trigger angelegt)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create unique index profiles_username_unique_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- Security-definer Helfer: Benutzername frei? (auch pre-auth beim Signup nutzbar)
create function public.username_available(p_username text, p_exclude_id uuid default null)
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

-- Security-definer Helfer: E-Mail zu Benutzername auflösen (Login mit Benutzername statt E-Mail)
create function public.get_email_for_username(p_username text)
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

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Freundschaften (Anfrage per Benutzername, muss von der Gegenseite bestätigt werden)
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

-- Helper: sind zwei Personen befreundet (status = accepted)?
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
-- Welten & Mitgliedschaft (Beitritt nur über Einladung durch die/den Ersteller:in)
-- ---------------------------------------------------------------------------
create table public.worlds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_image_url text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.world_members (
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

-- Helper, um rekursive RLS-Checks auf world_members zu vermeiden.
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

-- Welten sind für alle angemeldeten Personen durchsuchbar (Name/Beschreibung/Titelbild);
-- Mitglieder, Charaktere und Story bleiben über die jeweils eigenen Policies geschützt.
create policy "worlds_select_all" on public.worlds
  for select to authenticated using (true);

create policy "worlds_insert_own" on public.worlds
  for insert to authenticated with check (created_by = auth.uid());

create policy "worlds_update_own" on public.worlds
  for update to authenticated using (created_by = auth.uid());

-- Welten, denen man folgt, um ihre Feed-Beiträge zu sehen, ohne Mitglied zu sein.
create table public.world_follows (
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

alter table public.world_follows enable row level security;

create policy "world_follows_own" on public.world_follows
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

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
-- Characters (gehören zu genau einer Welt)
-- ---------------------------------------------------------------------------
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  sheet_url text,
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "characters_select_world_member" on public.characters
  for select to authenticated using (public.is_world_member(world_id));

-- Damit der weltübergreifende Feed Name/Avatar von Charakteren aus gefolgten
-- Welten anzeigen kann (nicht nur die Post-Zeile selbst sichtbar machen).
create policy "characters_select_followed_world" on public.characters
  for select to authenticated using (
    exists (
      select 1 from public.world_follows wf
      where wf.world_id = characters.world_id and wf.user_id = auth.uid()
    )
  );

create policy "characters_insert_own" on public.characters
  for insert to authenticated with check (owner_id = auth.uid() and public.is_world_member(world_id));

create policy "characters_update_own" on public.characters
  for update to authenticated using (owner_id = auth.uid());

create policy "characters_delete_own" on public.characters
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Posts (weltübergreifender Feed, nur für Freunde sichtbar) & Comments
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts_select_own_or_friends" on public.posts
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and (c.owner_id = auth.uid() or public.is_friend_of(c.owner_id))
    )
  );

-- Security-definer Helfer: Post-Charakter in einer gefolgten Welt?
-- (direkter Join auf `characters` in der Policy würde an dessen eigener
-- RLS scheitern, siehe is_world_member/is_friend_of für das gleiche Muster.)
create function public.is_followed_world_character(_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.characters c
    join public.world_follows wf on wf.world_id = c.world_id
    where c.id = _character_id and wf.user_id = auth.uid()
  );
$$;

grant execute on function public.is_followed_world_character(uuid) to authenticated;

create policy "posts_select_followed_world" on public.posts
  for select to authenticated using (public.is_followed_world_character(character_id));

create policy "posts_insert_own_character" on public.posts
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create policy "posts_update_own" on public.posts
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create policy "posts_delete_own" on public.posts
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "comments_select_if_post_visible" on public.comments
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      join public.characters pc on pc.id = p.character_id
      where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
    )
  );

create function public.is_followed_world_post(_post_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.posts p
    join public.characters c on c.id = p.character_id
    join public.world_follows wf on wf.world_id = c.world_id
    where p.id = _post_id and wf.user_id = auth.uid()
  );
$$;

grant execute on function public.is_followed_world_post(uuid) to authenticated;

create policy "comments_select_followed_world" on public.comments
  for select to authenticated using (public.is_followed_world_post(post_id));

create policy "comments_insert_own_character" on public.comments
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    and exists (
      select 1 from public.posts p
      join public.characters pc on pc.id = p.character_id
      where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
    )
  );

create policy "comments_delete_own" on public.comments
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Story-Sektion (RPG): mehrere parallele Szenen/Threads pro Welt
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

-- ---------------------------------------------------------------------------
-- Chats (1:1 und Gruppen) - Zugriff nur für Teilnehmer
-- ---------------------------------------------------------------------------
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_group boolean not null default false,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.chat_participants (
  chat_id uuid not null references public.chats (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  primary key (chat_id, character_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Security-definer-Helper, um rekursive RLS-Checks auf chat_participants zu vermeiden.
create function public.is_chat_participant(_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.chat_participants cp
    join public.characters c on c.id = cp.character_id
    where cp.chat_id = _chat_id and c.owner_id = auth.uid()
  );
$$;

alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

create policy "chats_select_participant" on public.chats
  for select to authenticated using (
    public.is_chat_participant(id) or created_by = auth.uid()
  );

create policy "chats_insert_own" on public.chats
  for insert to authenticated with check (created_by = auth.uid());

create policy "chats_update_participant" on public.chats
  for update to authenticated using (public.is_chat_participant(id) or created_by = auth.uid());

create policy "chat_participants_select_participant" on public.chat_participants
  for select to authenticated using (public.is_chat_participant(chat_id));

create policy "chat_participants_insert" on public.chat_participants
  for insert to authenticated with check (
    public.is_chat_participant(chat_id)
    or exists (select 1 from public.chats ch where ch.id = chat_id and ch.created_by = auth.uid())
  );

create policy "messages_select_participant" on public.messages
  for select to authenticated using (public.is_chat_participant(chat_id));

create policy "messages_insert_participant" on public.messages
  for insert to authenticated with check (
    public.is_chat_participant(chat_id)
    and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Realtime: Nachrichten-Tabelle für Live-Updates freigeben
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Avatar-Uploads (Supabase Storage)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)
on conflict (id) do nothing;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

create policy "avatars_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

create policy "avatars_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');

-- ---------------------------------------------------------------------------
-- Gelesen-Status pro Chat und Person (für Benachrichtigungen/Badges)
-- ---------------------------------------------------------------------------
create table public.chat_reads (
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

alter table public.chat_reads enable row level security;

create policy "chat_reads_own" on public.chat_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter publication supabase_realtime add table public.chat_reads;

-- ---------------------------------------------------------------------------
-- Bilder/GIFs in Posts (Supabase Storage)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('post-images', 'post-images', true, 10485760)
on conflict (id) do nothing;

create policy "post_images_public_read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "post_images_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'post-images');

create policy "post_images_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'post-images');

-- ---------------------------------------------------------------------------
-- Welt-Titelbilder (Supabase Storage)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('world-covers', 'world-covers', true, 10485760)
on conflict (id) do nothing;

create policy "world_covers_public_read" on storage.objects
  for select using (bucket_id = 'world-covers');

create policy "world_covers_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'world-covers');

create policy "world_covers_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id = 'world-covers');

create policy "world_covers_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'world-covers');
