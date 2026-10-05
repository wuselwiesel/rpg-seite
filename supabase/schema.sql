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

create policy "worlds_delete_own" on public.worlds
  for delete to authenticated using (created_by = auth.uid());

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
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index posts_tags_idx on public.posts using gin (tags);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz
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

create policy "comments_update_own" on public.comments
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Likes für Feed-Beiträge und Kommentare
-- ---------------------------------------------------------------------------
create table public.likes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint likes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  )
);

create unique index likes_character_post_unique_idx
  on public.likes (character_id, post_id) where post_id is not null;

create unique index likes_character_comment_unique_idx
  on public.likes (character_id, comment_id) where comment_id is not null;

alter table public.likes enable row level security;

create policy "likes_select_all" on public.likes
  for select to authenticated using (true);

create policy "likes_insert_own" on public.likes
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create policy "likes_delete_own" on public.likes
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Story-Sektion (RPG): mehrere parallele Szenen/Threads pro Welt
-- ---------------------------------------------------------------------------

-- Benannte Handlungsstränge, die mehrere Story-Posts bündeln (z.B. "Der
-- Sturm-Arc"), damit sie nicht in der chronologischen Liste untergehen.
create table public.story_arcs (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.story_posts (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  arc_id uuid references public.story_arcs (id) on delete set null,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  is_private boolean not null default false,
  pinned boolean not null default false,
  locked boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index story_posts_tags_idx on public.story_posts using gin (tags);
create index story_posts_arc_idx on public.story_posts (arc_id);

-- Charaktere, die eine als "geheim" markierte Szene zusätzlich zur Autorin/
-- zum Autor sehen dürfen (z.B. ein Vier-Augen-Gespräch).
create table public.story_post_viewers (
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  primary key (story_post_id, character_id)
);

create table public.story_entries (
  id uuid primary key default gen_random_uuid(),
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  roll_label text,
  roll_stat_name text,
  roll_value integer,
  roll_bonus integer,
  roll_die integer,
  roll_result integer,
  roll_success boolean,
  roll_target_character_id uuid references public.characters (id) on delete set null,
  roll_luck_remaining integer
);

alter table public.story_posts enable row level security;
alter table public.story_post_viewers enable row level security;
alter table public.story_entries enable row level security;
alter table public.story_arcs enable row level security;

-- Security-definer Helfer: darf die aktuelle Person eine geheime Szene sehen -
-- entweder als deren Autor:in oder als eine der explizit erlaubten Personen?
create function public.can_view_private_story_post(_story_post_id uuid, _post_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (select 1 from public.characters c where c.id = _post_character_id and c.owner_id = auth.uid())
    or exists (
      select 1 from public.story_post_viewers spv
      join public.characters c on c.id = spv.character_id
      where spv.story_post_id = _story_post_id and c.owner_id = auth.uid()
    );
$$;

grant execute on function public.can_view_private_story_post(uuid, uuid) to authenticated;

create policy "story_posts_select_member" on public.story_posts
  for select to authenticated using (
    public.is_world_member(world_id)
    and (not is_private or public.can_view_private_story_post(id, character_id))
  );

create policy "story_posts_insert_member" on public.story_posts
  for insert to authenticated with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id and c.owner_id = auth.uid() and c.world_id = story_posts.world_id
    )
  );

-- Welt-Owner dürfen Szenen anpinnen/sperren/archivieren (Moderationswerkzeuge).
create policy "story_posts_update_world_owner" on public.story_posts
  for update to authenticated using (
    exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

create policy "story_post_viewers_select_own_post" on public.story_post_viewers
  for select to authenticated using (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = sp.character_id
      where sp.id = story_post_id and c.owner_id = auth.uid()
    )
  );

create policy "story_post_viewers_insert_own_post" on public.story_post_viewers
  for insert to authenticated with check (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = sp.character_id
      where sp.id = story_post_id and c.owner_id = auth.uid()
    )
  );

create policy "story_post_viewers_delete_own_post" on public.story_post_viewers
  for delete to authenticated using (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = sp.character_id
      where sp.id = story_post_id and c.owner_id = auth.uid()
    )
  );

-- Auch die gelistete Person selbst darf sehen, dass sie als Viewer
-- eingetragen ist (nicht nur die Autorin/der Autor der Szene).
create policy "story_post_viewers_select_own_viewer" on public.story_post_viewers
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create policy "story_arcs_select_member" on public.story_arcs
  for select to authenticated using (public.is_world_member(world_id));

create policy "story_arcs_insert_member" on public.story_arcs
  for insert to authenticated with check (
    created_by = auth.uid() and public.is_world_member(world_id)
  );

create policy "story_arcs_delete_own" on public.story_arcs
  for delete to authenticated using (created_by = auth.uid());

create policy "story_entries_select_member" on public.story_entries
  for select to authenticated using (
    exists (
      select 1 from public.story_posts sp
      where sp.id = story_post_id
        and public.is_world_member(sp.world_id)
        and (not sp.is_private or public.can_view_private_story_post(sp.id, sp.character_id))
    )
  );

-- Wichtig: "character_id" muss hier explizit als story_entries.character_id
-- qualifiziert werden - story_posts hat selbst eine character_id-Spalte
-- (die Autor:in des Posts), und ein unqualifizierter Verweis wird von
-- Postgres auf die NÄHERE Spalte im JOIN (sp.character_id) aufgelöst statt
-- auf die neue Zeile. Das ließ früher nur die Post-Autorin/den Post-Autor
-- selbst antworten - jede andere Person bekam eine RLS-Ablehnung.
create policy "story_entries_insert_member" on public.story_entries
  for insert to authenticated with check (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = story_entries.character_id
      where sp.id = story_entries.story_post_id
        and c.owner_id = auth.uid()
        and c.world_id = sp.world_id
        and not sp.locked
        and (not sp.is_private or public.can_view_private_story_post(sp.id, sp.character_id))
    )
  );

-- Eigene Fortsetzungen dürfen bearbeitet werden - Würfelwürfe (roll_label
-- gesetzt) sind vom Zufall bestimmt und deshalb nur löschbar, nicht editierbar.
create policy "story_entries_update_own" on public.story_entries
  for update to authenticated using (
    roll_label is null
    and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  ) with check (
    roll_label is null
    and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create policy "story_entries_delete_own" on public.story_entries
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- Lesezeichen für Story-Posts (pro Person, weltübergreifend).
create table public.story_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, story_post_id)
);

alter table public.story_bookmarks enable row level security;

create policy "story_bookmarks_own" on public.story_bookmarks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Welt-Wiki: einfache Nachschlagewerk-Seiten (Orte, NPCs, Fraktionen, ...) pro Welt.
create table public.wiki_pages (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  category text not null default 'sonstiges' check (category in ('ort', 'npc', 'fraktion', 'sonstiges')),
  title text not null,
  content text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wiki_pages_world_idx on public.wiki_pages (world_id);

alter table public.wiki_pages enable row level security;

create policy "wiki_pages_select_member" on public.wiki_pages
  for select to authenticated using (public.is_world_member(world_id));

create policy "wiki_pages_insert_member" on public.wiki_pages
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

create policy "wiki_pages_update_own_or_world_owner" on public.wiki_pages
  for update to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

create policy "wiki_pages_delete_own_or_world_owner" on public.wiki_pages
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
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
  created_at timestamptz not null default now(),
  updated_at timestamptz
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

create policy "messages_update_own" on public.messages
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create policy "messages_delete_own" on public.messages
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Realtime: Nachrichten-Tabelle für Live-Updates freigeben
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Emoji-Reaktionen auf Feed-Beiträge und Chat-Nachrichten
-- ---------------------------------------------------------------------------
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  emoji text not null,
  post_id uuid references public.posts (id) on delete cascade,
  message_id uuid references public.messages (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint reactions_target_check check (
    (post_id is not null and message_id is null) or (post_id is null and message_id is not null)
  )
);

create unique index reactions_char_post_emoji_unique_idx
  on public.reactions (character_id, post_id, emoji) where post_id is not null;
create unique index reactions_char_message_emoji_unique_idx
  on public.reactions (character_id, message_id, emoji) where message_id is not null;

alter table public.reactions enable row level security;

create policy "reactions_select_post_visible" on public.reactions
  for select to authenticated using (
    post_id is not null and exists (
      select 1 from public.posts p join public.characters pc on pc.id = p.character_id
      where p.id = reactions.post_id
        and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id) or public.is_followed_world_character(pc.id))
    )
  );

create policy "reactions_select_message_participant" on public.reactions
  for select to authenticated using (
    message_id is not null and exists (
      select 1 from public.messages m where m.id = reactions.message_id and public.is_chat_participant(m.chat_id)
    )
  );

create policy "reactions_insert_own" on public.reactions
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    and (
      (post_id is not null and exists (
        select 1 from public.posts p join public.characters pc on pc.id = p.character_id
        where p.id = reactions.post_id
          and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id) or public.is_followed_world_character(pc.id))
      ))
      or
      (message_id is not null and exists (
        select 1 from public.messages m where m.id = reactions.message_id and public.is_chat_participant(m.chat_id)
      ))
    )
  );

create policy "reactions_delete_own" on public.reactions
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Beziehungsnetz: wer ist mit wem wie verbunden. "type" ist eine frei
-- gewählte Bezeichnung (z.B. "Befreundet") statt eines festen Enums, mit
-- einer selbst gewählten Farbe fürs Netz-Diagramm.
-- ---------------------------------------------------------------------------
create table public.character_relationships (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  character_a_id uuid not null references public.characters (id) on delete cascade,
  character_b_id uuid not null references public.characters (id) on delete cascade,
  type text not null default 'Verbunden',
  color text not null default '#9a9a9a',
  label text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint character_relationships_distinct check (character_a_id <> character_b_id)
);

create index character_relationships_world_idx on public.character_relationships (world_id);

alter table public.character_relationships enable row level security;

create policy "character_relationships_select_member" on public.character_relationships
  for select to authenticated using (public.is_world_member(world_id));

create policy "character_relationships_insert_member" on public.character_relationships
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

create policy "character_relationships_delete_own_or_world_owner" on public.character_relationships
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

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
-- Benachrichtigungen (neue Nachrichten, Erwähnungen, Freundschaftsanfragen)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  actor_name text,
  actor_avatar_url text,
  link text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- Für Chat-Nachrichten wird pro (Nutzer:in, Chat) nur eine Benachrichtigung
-- aktuell gehalten, damit ein aktiver Chat den Verlauf nicht zuspammt.
create unique index notifications_chat_unique_idx
  on public.notifications (user_id, link)
  where (type = 'chat_message');

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid());

create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Security-definer Helfer zum kontrollierten Anlegen einer Benachrichtigung für
-- eine andere Person (Erwähnung/Freundschaftsanfrage), ohne dass normale
-- Nutzer:innen ein direktes Insert-Recht auf fremde Zeilen brauchen.
create function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_name text,
  p_actor_avatar_url text,
  p_link text,
  p_message text,
  p_recipient_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name)
  values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name);
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, text, text, text) to authenticated;

-- Neue Chat-Nachrichten lösen automatisch eine Benachrichtigung für alle
-- anderen Teilnehmer:innen aus - unabhängig davon, ob die Nachricht über eine
-- Server Action oder direkt clientseitig eingefügt wurde.
create function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_owner uuid;
  sender_name text;
  sender_avatar text;
begin
  select owner_id, name, avatar_url into sender_owner, sender_name, sender_avatar
  from public.characters where id = new.character_id;

  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, created_at, read_at)
  select distinct c.owner_id, 'chat_message', sender_name, sender_avatar,
    '/chats/' || new.chat_id, 'hat dir geschrieben', new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and c.owner_id <> sender_owner
  on conflict (user_id, link) where (type = 'chat_message')
  do update set
    actor_name = excluded.actor_name,
    actor_avatar_url = excluded.actor_avatar_url,
    message = excluded.message,
    created_at = excluded.created_at,
    read_at = null;

  return new;
end;
$$;

create trigger on_message_notify
  after insert on public.messages
  for each row execute procedure public.notify_new_message();

alter publication supabase_realtime add table public.notifications;

-- ---------------------------------------------------------------------------
-- Web-Push-Abos für echte Browser-Benachrichtigungen
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Security-definer Helfer, damit ein Server Action beim Erzeugen einer
-- Benachrichtigung auch die Push-Abos der Zielperson lesen/aufräumen kann,
-- obwohl RLS diese sonst auf die jeweils eigene user_id beschränkt - analog
-- zu create_notification.
create function public.get_push_subscriptions(p_user_id uuid)
returns table(endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
stable
as $$
  select endpoint, p256dh, auth from public.push_subscriptions where user_id = p_user_id;
$$;

grant execute on function public.get_push_subscriptions(uuid) to authenticated;

create function public.delete_stale_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

grant execute on function public.delete_stale_push_subscription(text) to authenticated;

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
-- Migration: Nutzernamen (@handle) für Charaktere und Charakter-Follows (wie bei Instagram)
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

alter table public.characters add column if not exists username text;

alter table public.characters drop constraint if exists characters_username_format;
alter table public.characters add constraint characters_username_format
  check (username is null or username ~ '^[a-z0-9._]{3,30}$');

create unique index if not exists characters_username_unique_idx
  on public.characters (lower(username)) where username is not null;

create table if not exists public.character_follows (
  follower_id uuid not null references public.characters (id) on delete cascade,
  followed_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint character_follows_not_self check (follower_id <> followed_id)
);

create index if not exists character_follows_followed_idx on public.character_follows (followed_id);

alter table public.character_follows enable row level security;

-- Sichtbar, sobald man den gefolgten Charakter selbst sehen darf (RLS von characters greift im Subselect).
create policy "character_follows_select" on public.character_follows
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_follows.followed_id)
  );

create policy "character_follows_insert_own" on public.character_follows
  for insert to authenticated with check (
    exists (
      select 1 from public.characters c
      where c.id = character_follows.follower_id and c.owner_id = auth.uid()
    )
    and exists (select 1 from public.characters c2 where c2.id = character_follows.followed_id)
  );

create policy "character_follows_delete_own" on public.character_follows
  for delete to authenticated using (
    exists (
      select 1 from public.characters c
      where c.id = character_follows.follower_id and c.owner_id = auth.uid()
    )
  );
-- Migration: Profil-Gestaltung pro Charakter (Schriftart, Akzentfarbe, Hintergrund) im Stil von Tumblr-Blogs
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

alter table public.characters add column if not exists theme_font text;
alter table public.characters add column if not exists theme_accent text;
alter table public.characters add column if not exists theme_bg text;

alter table public.characters drop constraint if exists characters_theme_format;
alter table public.characters add constraint characters_theme_format check (
  (theme_accent is null or theme_accent ~ '^#[0-9a-fA-F]{6}$')
  and (theme_bg is null or theme_bg ~ '^#[0-9a-fA-F]{6}$')
  and (theme_font is null or theme_font in ('sans', 'serif', 'playfair', 'lora', 'caveat', 'mono'))
);
-- Migration: Chat-Benachrichtigungen auch zwischen eigenen Charakteren
-- Vorher wurde nur benachrichtigt, wenn die Empfänger:in ein anderer Account war.
-- Jetzt bekommt jede:r Besitzer:in eine Benachrichtigung für jeden Teilnehmer-Charakter,
-- der nicht der sendende Charakter ist.

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_owner uuid;
  sender_name text;
  sender_avatar text;
begin
  select owner_id, name, avatar_url into sender_owner, sender_name, sender_avatar
  from public.characters where id = new.character_id;

  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, created_at, read_at)
  select distinct on (c.owner_id) c.owner_id, 'chat_message', sender_name, sender_avatar,
    '/chats/' || new.chat_id,
    case when c.owner_id <> sender_owner then 'hat dir geschrieben' else 'hat ' || c.name || ' geschrieben' end,
    new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and cp.character_id <> new.character_id
  order by c.owner_id, (c.owner_id <> sender_owner) desc
  on conflict (user_id, link) where (type = 'chat_message')
  do update set
    actor_name = excluded.actor_name,
    actor_avatar_url = excluded.actor_avatar_url,
    message = excluded.message,
    created_at = excluded.created_at,
    read_at = null;

  return new;
end;
$$;
-- Migration: Chats löschen, Gruppenbild, Bilder in Nachrichten
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

alter table public.chats add column if not exists avatar_url text;
alter table public.messages add column if not exists image_url text;

-- Löschen: die Ersteller:in eines Chats, bei 1:1-Chats zusätzlich jede Teilnehmer:in.
drop policy if exists "chats_delete_own" on public.chats;
create policy "chats_delete_own" on public.chats
  for delete to authenticated using (
    created_by = auth.uid() or (not is_group and public.is_chat_participant(id))
  );

-- Bild-Uploads für Chat-Nachrichten
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-media', 'chat-media', true, 5242880)
on conflict (id) do nothing;

drop policy if exists "chat_media_public_read" on storage.objects;
create policy "chat_media_public_read" on storage.objects
  for select using (bucket_id = 'chat-media');

drop policy if exists "chat_media_authenticated_insert" on storage.objects;
create policy "chat_media_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat-media');
-- Migration: Chat-Benachrichtigungen pro angeschriebenem Charakter
-- Nur Charaktere, die eine Nachricht bekommen, werden benachrichtigt
-- ("<Absender> hat dir eine Nachricht geschickt"). Der Link enthält den
-- Empfänger-Charakter (?as=), damit ein Klick auf die Benachrichtigung
-- automatisch zu diesem Charakter wechselt und den Chat öffnet.

alter table public.notifications add column if not exists recipient_name text;

-- Alte, uneindeutige Chat-Benachrichtigungen ("A hat B geschrieben") entfernen.
delete from public.notifications where type = 'chat_message';

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  sender_avatar text;
begin
  select name, avatar_url into sender_name, sender_avatar
  from public.characters where id = new.character_id;

  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name, created_at, read_at)
  select c.owner_id, 'chat_message', sender_name, sender_avatar,
    '/chats/' || new.chat_id || '?as=' || c.id,
    'hat dir eine Nachricht geschickt',
    c.name,
    new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and cp.character_id <> new.character_id
  on conflict (user_id, link) where (type = 'chat_message')
  do update set
    actor_name = excluded.actor_name,
    actor_avatar_url = excluded.actor_avatar_url,
    message = excluded.message,
    recipient_name = excluded.recipient_name,
    created_at = excluded.created_at,
    read_at = null;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storys & Highlights (siehe migration_stories_highlights.sql)
-- ---------------------------------------------------------------------------

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  image_url text,
  text_content text,
  bg text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint stories_has_content check (image_url is not null or coalesce(text_content, '') <> '')
);
create index if not exists stories_character_idx on public.stories (character_id, created_at desc);
create index if not exists stories_expires_idx on public.stories (expires_at);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
create index if not exists highlights_character_idx on public.highlights (character_id, created_at);

create table if not exists public.highlight_stories (
  highlight_id uuid not null references public.highlights (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  position int not null default 0,
  primary key (highlight_id, story_id)
);

alter table public.stories enable row level security;
alter table public.highlights enable row level security;
alter table public.highlight_stories enable row level security;

-- Sichtbar wie Beiträge: eigene, von Freund:innen oder aus gefolgten Welten.
drop policy if exists "stories_select" on public.stories;
create policy "stories_select" on public.stories
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and (c.owner_id = auth.uid() or public.is_friend_of(c.owner_id))
    )
    or public.is_followed_world_character(character_id)
  );
drop policy if exists "stories_insert_own" on public.stories;
create policy "stories_insert_own" on public.stories
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );
drop policy if exists "stories_delete_own" on public.stories;
create policy "stories_delete_own" on public.stories
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

drop policy if exists "highlights_select" on public.highlights;
create policy "highlights_select" on public.highlights
  for select to authenticated using (
    exists (
      select 1 from public.characters c
      where c.id = character_id and (c.owner_id = auth.uid() or public.is_friend_of(c.owner_id))
    )
    or public.is_followed_world_character(character_id)
  );
drop policy if exists "highlights_insert_own" on public.highlights;
create policy "highlights_insert_own" on public.highlights
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );
drop policy if exists "highlights_update_own" on public.highlights;
create policy "highlights_update_own" on public.highlights
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );
drop policy if exists "highlights_delete_own" on public.highlights;
create policy "highlights_delete_own" on public.highlights
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

drop policy if exists "highlight_stories_select" on public.highlight_stories;
create policy "highlight_stories_select" on public.highlight_stories
  for select to authenticated using (
    exists (select 1 from public.highlights h where h.id = highlight_id)
  );
drop policy if exists "highlight_stories_insert_own" on public.highlight_stories;
create policy "highlight_stories_insert_own" on public.highlight_stories
  for insert to authenticated with check (
    exists (
      select 1 from public.highlights h
      join public.characters c on c.id = h.character_id
      where h.id = highlight_id and c.owner_id = auth.uid()
    )
  );
drop policy if exists "highlight_stories_delete_own" on public.highlight_stories;
create policy "highlight_stories_delete_own" on public.highlight_stories
  for delete to authenticated using (
    exists (
      select 1 from public.highlights h
      join public.characters c on c.id = h.character_id
      where h.id = highlight_id and c.owner_id = auth.uid()
    )
  );

-- Frei platzierbare Texte auf Storys
alter table public.stories add column if not exists overlays jsonb;

-- Musik auf Storys
alter table public.stories add column if not exists audio_url text;
alter table public.stories add column if not exists audio_name text;

-- Fotos und Videos in Beiträgen, Videos in Storys
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists media_type text;
alter table public.stories add column if not exists video_url text;
alter table public.stories drop constraint if exists stories_has_content;
alter table public.stories add constraint stories_has_content
  check (image_url is not null or video_url is not null or coalesce(text_content, '') <> '');

insert into storage.buckets (id, name, public, file_size_limit)
values ('post-media', 'post-media', true, 52428800)
on conflict (id) do update set file_size_limit = 52428800;

drop policy if exists "post_media_public_read" on storage.objects;
create policy "post_media_public_read" on storage.objects
  for select using (bucket_id = 'post-media');

drop policy if exists "post_media_authenticated_insert" on storage.objects;
create policy "post_media_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'post-media');

-- Soziale Funktionen (siehe migration_social_features.sql)

alter table public.posts add column if not exists media_urls text[];
alter table public.posts add column if not exists pinned boolean not null default false;
alter table public.posts add column if not exists publish_at timestamptz not null default now();
alter table public.posts add column if not exists story_post_id uuid references public.story_posts (id) on delete set null;
create index if not exists posts_publish_idx on public.posts (publish_at desc);

alter table public.comments add column if not exists parent_id uuid references public.comments (id) on delete cascade;

alter table public.messages add column if not exists reply_to_id uuid references public.messages (id) on delete set null;
alter table public.messages add column if not exists shared_post_id uuid references public.posts (id) on delete set null;
alter table public.messages add column if not exists story_id uuid references public.stories (id) on delete set null;

-- Gelesen-Haken: Teilnehmer:innen eines Chats dürfen die Lesezeitpunkte der anderen sehen.
drop policy if exists "chat_reads_select_participants" on public.chat_reads;
create policy "chat_reads_select_participants" on public.chat_reads
  for select to authenticated using (public.is_chat_participant(chat_id));

create table if not exists public.story_likes (
  story_id uuid not null references public.stories (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, character_id)
);
alter table public.story_likes enable row level security;

drop policy if exists "story_likes_select" on public.story_likes;
create policy "story_likes_select" on public.story_likes
  for select to authenticated using (exists (select 1 from public.stories s where s.id = story_id));
drop policy if exists "story_likes_insert_own" on public.story_likes;
create policy "story_likes_insert_own" on public.story_likes
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );
drop policy if exists "story_likes_delete_own" on public.story_likes;
create policy "story_likes_delete_own" on public.story_likes
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- Musik-Ausschnitt einer Story: Startzeit und Länge (Sekunden) innerhalb des Songs.
alter table public.stories add column if not exists audio_start real not null default 0;
alter table public.stories add column if not exists audio_length real;

-- ---------------------------------------------------------------------------
-- Szenen: Szenen mit Ort/Zeit, Kapitel, Erzähler-Einträge, "Wer ist dran?"

alter table public.story_posts
  add column if not exists location text,
  add column if not exists in_world_time text,
  add column if not exists turn_character_id uuid references public.characters (id) on delete set null,
  add column if not exists turn_set_at timestamptz,
  add column if not exists last_reminder_at timestamptz;

create index if not exists story_posts_location_idx on public.story_posts (world_id, location);
create index if not exists story_posts_turn_idx on public.story_posts (turn_character_id);

alter table public.story_entries
  add column if not exists kind text not null default 'entry',
  add column if not exists chapter_title text,
  add column if not exists chapter_summary text;

alter table public.story_entries drop constraint if exists story_entries_kind_check;
alter table public.story_entries
  add constraint story_entries_kind_check check (kind in ('entry', 'narrator', 'chapter'));

-- Die Autor:in einer Szene darf Ort/Zeit nachträglich ändern.
drop policy if exists "story_posts_update_author" on public.story_posts;
create policy "story_posts_update_author" on public.story_posts
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- Wer ist als Nächstes dran? Darf jede Person setzen, die in der Welt einen
-- Charakter hat (das Schreiben der Fortsetzung setzt es automatisch).
create or replace function public.set_story_turn(p_story_post_id uuid, p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
begin
  select world_id into v_world from public.story_posts where id = p_story_post_id;
  if v_world is null then return; end if;
  if not exists (
    select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if p_character_id is not null and not exists (
    select 1 from public.characters c where c.id = p_character_id and c.world_id = v_world
  ) then
    raise exception 'Ungültiger Charakter';
  end if;
  update public.story_posts
    set turn_character_id = p_character_id, turn_set_at = now()
    where id = p_story_post_id;
end;
$$;

grant execute on function public.set_story_turn(uuid, uuid) to authenticated;

-- Erinnerungen sind auf eine alle 30 Minuten pro Szene begrenzt.
create or replace function public.touch_turn_reminder(p_story_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_last timestamptz;
begin
  select world_id, last_reminder_at into v_world, v_last from public.story_posts where id = p_story_post_id;
  if v_world is null or not public.is_world_member(v_world) then return false; end if;
  if v_last is not null and v_last > now() - interval '30 minutes' then return false; end if;
  update public.story_posts set last_reminder_at = now() where id = p_story_post_id;
  return true;
end;
$$;

grant execute on function public.touch_turn_reminder(uuid) to authenticated;

-- Wiki: Alternativnamen für die automatische Verlinkung
alter table public.wiki_pages add column if not exists aliases text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- Migration: Beziehungen mit Kategorie, Verlauf und Stammbaum-Rollen; Haus/Familie pro Charakter

alter table public.characters add column if not exists house text;

alter table public.character_relationships
  add column if not exists category text not null default 'sonstiges',
  add column if not exists family_role text,
  add column if not exists change_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.character_relationships drop constraint if exists character_relationships_category_check;
alter table public.character_relationships
  add constraint character_relationships_category_check
  check (category in ('familie', 'liebe', 'freundschaft', 'rivalitaet', 'buendnis', 'sonstiges'));

alter table public.character_relationships drop constraint if exists character_relationships_family_role_check;
alter table public.character_relationships
  add constraint character_relationships_family_role_check
  check (family_role is null or family_role in ('eltern', 'partner', 'geschwister', 'verwandt'));

-- Bestehende Beziehungen anhand der Bezeichnung einer Kategorie zuordnen.
update public.character_relationships set category = case
  when type ilike any (array['%famil%', '%verwandt%', '%bruder%', '%schwester%', '%eltern%', '%vater%', '%mutter%', '%sohn%', '%tochter%']) then 'familie'
  when type ilike any (array['%lieb%', '%liiert%', '%partner%', '%ehe%', '%paar%', '%verlobt%']) then 'liebe'
  when type ilike any (array['%rival%', '%feind%', '%gegner%', '%hass%']) then 'rivalitaet'
  when type ilike any (array['%freund%', '%vertraut%']) then 'freundschaft'
  when type ilike any (array['%verb_ndet%', '%allianz%', '%b_ndnis%']) then 'buendnis'
  else 'sonstiges' end
where category = 'sonstiges';

create table if not exists public.relationship_history (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.character_relationships (id) on delete cascade,
  world_id uuid not null references public.worlds (id) on delete cascade,
  type text not null,
  category text not null,
  color text not null,
  label text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists relationship_history_rel_idx on public.relationship_history (relationship_id, created_at);

alter table public.relationship_history enable row level security;

drop policy if exists "relationship_history_select_member" on public.relationship_history;
create policy "relationship_history_select_member" on public.relationship_history
  for select to authenticated using (public.is_world_member(world_id));

-- Jede Änderung von Art/Kategorie/Farbe/Notiz wird automatisch im Verlauf festgehalten.
create or replace function public.log_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, null, auth.uid());
  elsif new.type is distinct from old.type
     or new.category is distinct from old.category
     or new.color is distinct from old.color
     or new.label is distinct from old.label then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, new.change_note, auth.uid());
    new.change_note := null;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists relationship_history_ins on public.character_relationships;
create trigger relationship_history_ins after insert on public.character_relationships
  for each row execute procedure public.log_relationship_change();

drop trigger if exists relationship_history_upd on public.character_relationships;
create trigger relationship_history_upd before update on public.character_relationships
  for each row execute procedure public.log_relationship_change();

-- Anfangsstand für bestehende Beziehungen.
insert into public.relationship_history (relationship_id, world_id, type, category, color, label, created_by, created_at)
select r.id, r.world_id, r.type, r.category, r.color, r.label, r.created_by, r.created_at
from public.character_relationships r
where not exists (select 1 from public.relationship_history h where h.relationship_id = r.id);

-- Ändern dürfen: Ersteller:in, Welt-Owner und die Besitzer:innen der beiden Charaktere.
drop policy if exists "character_relationships_update_involved" on public.character_relationships;
create policy "character_relationships_update_involved" on public.character_relationships
  for update to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
    or exists (
      select 1 from public.characters c
      where c.id in (character_a_id, character_b_id) and c.owner_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- Migration: Stille Chats und @-Erwähnungen in Chat-Nachrichten

alter table public.chat_participants add column if not exists muted boolean not null default false;

-- Die eigene Teilnahme (Charakter gehört mir) darf stumm geschaltet werden.
drop policy if exists "chat_participants_update_own" on public.chat_participants;
create policy "chat_participants_update_own" on public.chat_participants
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- Stumme Chats melden sich nur, wenn der Charakter per @[Name](id) erwähnt wird.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  sender_avatar text;
begin
  select name, avatar_url into sender_name, sender_avatar
  from public.characters where id = new.character_id;

  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name, created_at, read_at)
  select c.owner_id, 'chat_message', sender_name, sender_avatar,
    '/chats/' || new.chat_id || '?as=' || c.id,
    case when position('(' || c.id::text || ')' in new.content) > 0
      then 'hat dich in einer Nachricht erwähnt' else 'hat dir eine Nachricht geschickt' end,
    c.name,
    new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and cp.character_id <> new.character_id
    and (not cp.muted or position('(' || c.id::text || ')' in new.content) > 0)
  on conflict (user_id, link) where (type = 'chat_message')
  do update set
    actor_name = excluded.actor_name,
    actor_avatar_url = excluded.actor_avatar_url,
    message = excluded.message,
    recipient_name = excluded.recipient_name,
    created_at = excluded.created_at,
    read_at = null;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Migration: Charaktere in Beiträgen markieren (wie bei Instagram)

create table if not exists public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  primary key (post_id, character_id)
);

create index if not exists post_tags_character_idx on public.post_tags (character_id);

alter table public.post_tags enable row level security;

drop policy if exists "post_tags_select" on public.post_tags;
create policy "post_tags_select" on public.post_tags
  for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "post_tags_insert_author" on public.post_tags;
create policy "post_tags_insert_author" on public.post_tags
  for insert to authenticated with check (
    exists (
      select 1 from public.posts p
      join public.characters c on c.id = p.character_id
      where p.id = post_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "post_tags_delete_author" on public.post_tags;
create policy "post_tags_delete_author" on public.post_tags
  for delete to authenticated using (
    exists (
      select 1 from public.posts p
      join public.characters c on c.id = p.character_id
      where p.id = post_id and c.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Migration: Story-Sticker (Umfrage, Fragen-Box, Countdown)

alter table public.stories add column if not exists stickers jsonb;

create table if not exists public.story_sticker_votes (
  story_id uuid not null references public.stories (id) on delete cascade,
  sticker_id text not null,
  character_id uuid not null references public.characters (id) on delete cascade,
  option_idx integer not null check (option_idx between 0 and 3),
  created_at timestamptz not null default now(),
  primary key (story_id, sticker_id, character_id)
);

create table if not exists public.story_sticker_answers (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  sticker_id text not null,
  character_id uuid not null references public.characters (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists story_sticker_answers_story_idx on public.story_sticker_answers (story_id);

alter table public.story_sticker_votes enable row level security;
alter table public.story_sticker_answers enable row level security;

-- Stimmen: sichtbar, sobald die Story sichtbar ist; abgeben darf man mit einem eigenen Charakter.
drop policy if exists "story_sticker_votes_select" on public.story_sticker_votes;
create policy "story_sticker_votes_select" on public.story_sticker_votes
  for select to authenticated using (exists (select 1 from public.stories s where s.id = story_id));

drop policy if exists "story_sticker_votes_insert" on public.story_sticker_votes;
create policy "story_sticker_votes_insert" on public.story_sticker_votes
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    and exists (select 1 from public.stories s where s.id = story_id)
  );

-- Antworten: nur die Story-Besitzer:in und die Antwortende selbst sehen sie.
drop policy if exists "story_sticker_answers_select" on public.story_sticker_answers;
create policy "story_sticker_answers_select" on public.story_sticker_answers
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    or exists (
      select 1 from public.stories s join public.characters c on c.id = s.character_id
      where s.id = story_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "story_sticker_answers_insert" on public.story_sticker_answers;
create policy "story_sticker_answers_insert" on public.story_sticker_answers
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    and exists (select 1 from public.stories s where s.id = story_id)
  );

-- Storys nur mit Stickern erlauben
alter table public.stories drop constraint if exists stories_has_content;
alter table public.stories add constraint stories_has_content check (image_url is not null or video_url is not null or coalesce(text_content, '') <> '' or overlays is not null or stickers is not null);

-- ---------------------------------------------------------------------------
-- Migration: Benachrichtigungs-Einstellungen (pro Welt/Charakter stumm, Nicht stören, tägliche Zusammenfassung)

create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dnd_enabled boolean not null default false,
  dnd_start text not null default '22:00',
  dnd_end text not null default '08:00',
  timezone text not null default 'Europe/Berlin',
  digest_enabled boolean not null default false,
  digest_only boolean not null default false,
  digest_last_sent_at timestamptz,
  muted_world_ids uuid[] not null default '{}',
  muted_character_ids uuid[] not null default '{}',
  muted_notification_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "notification_prefs_own" on public.notification_prefs;
create policy "notification_prefs_own" on public.notification_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Für den Push-Versand (Server): Einstellungen der Empfänger:in lesen, ohne dass RLS im Weg ist.
create or replace function public.get_notification_prefs(p_user_id uuid)
returns setof public.notification_prefs
language sql
security definer
set search_path = public
stable
as $$
  select * from public.notification_prefs where user_id = p_user_id;
$$;

grant execute on function public.get_notification_prefs(uuid) to authenticated;

-- Geheimnisse (nur über security-definer-Funktionen lesbar; keine Policy = kein direkter Zugriff).
create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

-- Tägliche Zusammenfassung: wer bekommt sie heute? Nur mit dem Cron-Geheimnis aufrufbar.
create or replace function public.digest_due(p_secret text)
returns table(user_id uuid, unread_count integer, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is distinct from (select value from public.app_secrets where key = 'cron') then
    raise exception 'Nicht erlaubt';
  end if;
  return query
  with due as (
    select p.user_id,
      (select count(*)::int from public.notifications n where n.user_id = p.user_id and n.read_at is null) as unread
    from public.notification_prefs p
    where p.digest_enabled
      and (p.digest_last_sent_at is null or p.digest_last_sent_at < now() - interval '20 hours')
  ),
  marked as (
    update public.notification_prefs np set digest_last_sent_at = now()
    from due where np.user_id = due.user_id and due.unread > 0
    returning np.user_id
  )
  select d.user_id, d.unread, s.endpoint, s.p256dh, s.auth
  from due d
  join marked m on m.user_id = d.user_id
  join public.push_subscriptions s on s.user_id = d.user_id;
end;
$$;

grant execute on function public.digest_due(text) to anon, authenticated;

-- Szenen: Erzähler:in, Szene bearbeiten/löschen

alter table public.story_posts
  add column if not exists narrator boolean not null default false;

drop policy if exists "story_posts_delete_author" on public.story_posts;
create policy "story_posts_delete_author" on public.story_posts
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

notify pgrst, 'reload schema';

-- Push-Abos: Gerät gehört dem angemeldeten Konto
create or replace function public.claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

grant execute on function public.claim_push_subscription(text, text, text) to authenticated;

notify pgrst, 'reload schema';

-- KI-Zusammenfassung pro Szene
alter table public.story_posts
  add column if not exists ai_summary text,
  add column if not exists ai_summary_count integer;

-- Jedes Mitglied der Welt darf die Zusammenfassung speichern (die Tabelle selbst erlaubt Updates nur der Autor:in).
create or replace function public.set_story_summary(p_story_post_id uuid, p_summary text, p_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.story_posts sp
    where sp.id = p_story_post_id and public.is_world_member(sp.world_id)
  ) then
    raise exception 'Nicht erlaubt';
  end if;
  update public.story_posts
    set ai_summary = left(p_summary, 2000), ai_summary_count = p_count
    where id = p_story_post_id;
end;
$$;

grant execute on function public.set_story_summary(uuid, text, integer) to authenticated;

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- "Redaktion": Out-of-Character-Bereich für Account-Posts, Diskussionen und Umfragen
-- (Autor:in ist der Login-Account selbst, nicht ein Charakter) - welt-unabhängig,
-- sichtbar für die Autor:in und ihre akzeptierten Freund:innen (wie posts_select_own_or_friends,
-- aber auf Profil- statt Charakter-Ebene).

create table public.redaktion_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  image_url text,
  tags text[] not null default '{}',
  -- Umfrage-Konfiguration; poll_options.count() = 0 bedeutet "keine Umfrage, nur Diskussion".
  poll_multi_select boolean not null default false,
  poll_show_voters boolean not null default false,
  poll_character_mode boolean not null default false,
  poll_closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index redaktion_posts_author_idx on public.redaktion_posts (author_id);

alter table public.redaktion_posts enable row level security;

create policy "redaktion_posts_select_own_or_friends" on public.redaktion_posts
  for select to authenticated using (author_id = auth.uid() or public.is_friend_of(author_id));

create policy "redaktion_posts_insert_own" on public.redaktion_posts
  for insert to authenticated with check (author_id = auth.uid());

create policy "redaktion_posts_update_own" on public.redaktion_posts
  for update to authenticated using (author_id = auth.uid());

create policy "redaktion_posts_delete_own" on public.redaktion_posts
  for delete to authenticated using (author_id = auth.uid());

create table public.redaktion_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redaktion_posts (id) on delete cascade,
  label text not null,
  -- Bei Charakter-Umfragen (poll_character_mode) zeigt das auf den gewählten Charakter,
  -- statt den Namen als freien Text zu speichern - bleibt so aktuell, falls er umbenannt wird.
  character_id uuid references public.characters (id) on delete cascade,
  position int not null default 0
);

create index redaktion_poll_options_post_idx on public.redaktion_poll_options (post_id);

alter table public.redaktion_poll_options enable row level security;

create policy "redaktion_poll_options_select_if_post_visible" on public.redaktion_poll_options
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_poll_options_manage_own_post" on public.redaktion_poll_options
  for all to authenticated using (
    exists (select 1 from public.redaktion_posts p where p.id = post_id and p.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.redaktion_posts p where p.id = post_id and p.author_id = auth.uid())
  );

create table public.redaktion_poll_votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.redaktion_poll_options (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (option_id, voter_id)
);

create index redaktion_poll_votes_option_idx on public.redaktion_poll_votes (option_id);
create index redaktion_poll_votes_voter_idx on public.redaktion_poll_votes (voter_id);

alter table public.redaktion_poll_votes enable row level security;

create policy "redaktion_poll_votes_select_if_post_visible" on public.redaktion_poll_votes
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_poll_options o
      join public.redaktion_posts p on p.id = o.post_id
      where o.id = option_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_poll_votes_insert_own" on public.redaktion_poll_votes
  for insert to authenticated with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.redaktion_poll_options o
      join public.redaktion_posts p on p.id = o.post_id
      where o.id = option_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_poll_votes_delete_own" on public.redaktion_poll_votes
  for delete to authenticated using (voter_id = auth.uid());

create table public.redaktion_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redaktion_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  parent_id uuid references public.redaktion_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index redaktion_comments_post_idx on public.redaktion_comments (post_id);

alter table public.redaktion_comments enable row level security;

create policy "redaktion_comments_select_if_post_visible" on public.redaktion_comments
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_comments_insert_if_post_visible" on public.redaktion_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_comments_update_own" on public.redaktion_comments
  for update to authenticated using (author_id = auth.uid());

create policy "redaktion_comments_delete_own" on public.redaktion_comments
  for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Erlaubt der Besitzerin/dem Besitzer eines Beitrags, Kommentare von frei erfundenen "Profilen"
-- (nur Name + Avatar, nicht an einen echten Charakter gebunden) zu posten - z.B. damit ein Beitrag
-- aussieht, als wären mehrere Personen beteiligt. Nur für eigene Beiträge möglich; für alle anderen
-- Betrachter:innen sind diese Kommentare nicht von echten zu unterscheiden.
alter table public.comments
  alter column character_id drop not null,
  add column fake_author_id uuid references public.profiles (id) on delete cascade,
  add column fake_name text,
  add column fake_avatar_url text;

alter table public.comments
  add constraint comments_author_check check (
    (character_id is not null and fake_author_id is null and fake_name is null)
    or
    (character_id is null and fake_author_id is not null and fake_name is not null)
  );

create index comments_fake_author_idx on public.comments (fake_author_id);

drop policy "comments_insert_own_character" on public.comments;
create policy "comments_insert_own_character" on public.comments
  for insert to authenticated with check (
    (
      character_id is not null
      and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
      and exists (
        select 1 from public.posts p
        join public.characters pc on pc.id = p.character_id
        where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
      )
    )
    or
    (
      character_id is null
      and fake_author_id = auth.uid()
      and exists (
        select 1 from public.posts p
        join public.characters pc on pc.id = p.character_id
        where p.id = post_id and pc.owner_id = auth.uid()
      )
    )
  );

drop policy "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete to authenticated using (
    (character_id is not null and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
    or fake_author_id = auth.uid()
  );

drop policy "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update to authenticated using (
    (character_id is not null and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
    or fake_author_id = auth.uid()
  ) with check (
    (character_id is not null and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
    or fake_author_id = auth.uid()
  );

-- Redaktion-Beiträge sollen dieselben Beitragsarten wie der normale Feed unterstützen (Text,
-- Foto/Video mit mehreren Fotos, Verlinkung einer Story) statt nur ein einzelnes Bild.
alter table public.redaktion_posts rename column image_url to media_url;

alter table public.redaktion_posts
  add column media_type text check (media_type in ('image', 'video')),
  add column media_urls text[],
  add column story_post_id uuid references public.story_posts (id) on delete set null;

-- NPC-Kommentare sollen nicht nur auf eigenen Beiträgen möglich sein, sondern überall dort, wo man
-- auch "echt" (mit einem Charakter) kommentieren könnte - also auch auf Beiträgen von Freund:innen.
drop policy "comments_insert_own_character" on public.comments;
create policy "comments_insert_own_character" on public.comments
  for insert to authenticated with check (
    (
      character_id is not null
      and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
      and exists (
        select 1 from public.posts p
        join public.characters pc on pc.id = p.character_id
        where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
      )
    )
    or
    (
      character_id is null
      and fake_author_id = auth.uid()
      and exists (
        select 1 from public.posts p
        join public.characters pc on pc.id = p.character_id
        where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
      )
    )
  );

-- Der alte characters_theme_format-Constraint erlaubte nur die ursprünglichen 6 Schriftarten per
-- fester Liste und brach beim Speichern, sobald jemand eine seither hinzugefügte Schriftart wählte.
-- Jetzt wird nur noch das allgemeine Format geprüft (siehe PROFILE_FONTS-ids in profile-theme.ts),
-- damit neue Schriftarten künftig ohne DB-Migration nutzbar sind.
alter table public.characters drop constraint if exists characters_theme_format;
alter table public.characters add constraint characters_theme_format check (
  (theme_accent is null or theme_accent ~ '^#[0-9a-fA-F]{6}$')
  and (theme_bg is null or theme_bg ~ '^#[0-9a-fA-F]{6}$')
  and (theme_font is null or theme_font ~ '^[a-zA-Z0-9]{1,40}$')
);

-- ---------------------------------------------------------------------------
-- Redaktions-Profil: Banner, Bio, Status-Zeile, eigene Felder, Farben/Schrift und angeheftete Beiträge.
-- Eine Zeile pro Account (nicht pro Charakter); sichtbar für die Person selbst und ihre akzeptierten Freund:innen.
create table if not exists public.redaktion_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text,
  status_text text,
  banner_url text,
  theme_font text,
  theme_accent text,
  theme_bg text,
  -- [{ "icon": "📚", "title": "Lieblingsbuch", "text": "..." }, ...]
  custom_fields jsonb not null default '[]'::jsonb,
  pinned_post_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint redaktion_profiles_theme_format check (
    (theme_accent is null or theme_accent ~ '^#[0-9a-fA-F]{6}$')
    and (theme_bg is null or theme_bg ~ '^#[0-9a-fA-F]{6}$')
    and (theme_font is null or theme_font ~ '^[a-zA-Z0-9]{1,40}$')
  ),
  constraint redaktion_profiles_limits check (
    char_length(coalesce(bio, '')) <= 600
    and char_length(coalesce(status_text, '')) <= 80
    and jsonb_typeof(custom_fields) = 'array'
    and jsonb_array_length(custom_fields) <= 12
    and cardinality(pinned_post_ids) <= 3
  )
);

alter table public.redaktion_profiles enable row level security;

drop policy if exists "redaktion_profiles_select_own_or_friends" on public.redaktion_profiles;
create policy "redaktion_profiles_select_own_or_friends" on public.redaktion_profiles
  for select to authenticated using (user_id = auth.uid() or public.is_friend_of(user_id));

drop policy if exists "redaktion_profiles_insert_own" on public.redaktion_profiles;
create policy "redaktion_profiles_insert_own" on public.redaktion_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "redaktion_profiles_update_own" on public.redaktion_profiles;
create policy "redaktion_profiles_update_own" on public.redaktion_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Redaktions-Chat: Chats zwischen Accounts (nicht zwischen Charakteren), unabhängig von Welt und Rollenspiel.
create table if not exists public.account_chats (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.account_chat_participants (
  chat_id uuid not null references public.account_chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (chat_id, user_id)
);

create index if not exists account_chat_participants_user_idx on public.account_chat_participants (user_id);

create table if not exists public.account_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.account_chats (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists account_messages_chat_idx on public.account_messages (chat_id, created_at);

-- Security-definer-Helfer, damit die Policies nicht rekursiv auf account_chat_participants zugreifen.
create or replace function public.is_account_chat_member(p_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.account_chat_participants p
    where p.chat_id = p_chat_id and p.user_id = auth.uid()
  );
$$;

alter table public.account_chats enable row level security;
alter table public.account_chat_participants enable row level security;
alter table public.account_messages enable row level security;

drop policy if exists "account_chats_select_member" on public.account_chats;
create policy "account_chats_select_member" on public.account_chats
  for select to authenticated using (public.is_account_chat_member(id));

drop policy if exists "account_chat_participants_select_member" on public.account_chat_participants;
create policy "account_chat_participants_select_member" on public.account_chat_participants
  for select to authenticated using (public.is_account_chat_member(chat_id));

drop policy if exists "account_chat_participants_update_own" on public.account_chat_participants;
create policy "account_chat_participants_update_own" on public.account_chat_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "account_messages_select_member" on public.account_messages;
create policy "account_messages_select_member" on public.account_messages
  for select to authenticated using (public.is_account_chat_member(chat_id));

drop policy if exists "account_messages_insert_member" on public.account_messages;
create policy "account_messages_insert_member" on public.account_messages
  for insert to authenticated with check (sender_id = auth.uid() and public.is_account_chat_member(chat_id));

drop policy if exists "account_messages_update_own" on public.account_messages;
create policy "account_messages_update_own" on public.account_messages
  for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

drop policy if exists "account_messages_delete_own" on public.account_messages;
create policy "account_messages_delete_own" on public.account_messages
  for delete to authenticated using (sender_id = auth.uid());

-- Startet (oder findet) den 1:1-Chat mit einer befreundeten Person.
create or replace function public.start_account_chat(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_chat uuid;
begin
  if v_me is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Ungültige Person.';
  end if;
  if not public.is_friend_of(p_other) then
    raise exception 'Nur mit Freund:innen möglich.';
  end if;

  select c.id into v_chat
  from public.account_chats c
  where exists (select 1 from public.account_chat_participants a where a.chat_id = c.id and a.user_id = v_me)
    and exists (select 1 from public.account_chat_participants b where b.chat_id = c.id and b.user_id = p_other)
    and (select count(*) from public.account_chat_participants x where x.chat_id = c.id) = 2
  limit 1;

  if v_chat is null then
    insert into public.account_chats (created_by) values (v_me) returning id into v_chat;
    insert into public.account_chat_participants (chat_id, user_id) values (v_chat, v_me), (v_chat, p_other);
  end if;

  return v_chat;
end;
$$;

grant execute on function public.start_account_chat(uuid) to authenticated;

alter publication supabase_realtime add table public.account_messages;
alter publication supabase_realtime add table public.account_chat_participants;


-- ---------------------------------------------------------------------------
-- Eigene Chat-Farben: Hauptfarbe, Akzent und Hintergrund pro Person und Chat (Rollenspiel- und Redaktions-Chats).
create table if not exists public.chat_themes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chat_kind text not null check (chat_kind in ('account', 'rp')),
  chat_id uuid not null,
  main text,
  accent text,
  bg text,
  updated_at timestamptz not null default now(),
  primary key (user_id, chat_kind, chat_id),
  constraint chat_themes_hex check (
    (main is null or main ~ '^#[0-9a-fA-F]{6}$')
    and (accent is null or accent ~ '^#[0-9a-fA-F]{6}$')
    and (bg is null or bg ~ '^#[0-9a-fA-F]{6}$')
  )
);

alter table public.chat_themes enable row level security;

drop policy if exists "chat_themes_own" on public.chat_themes;
create policy "chat_themes_own" on public.chat_themes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Likes und Emoji-Reaktionen auf Redaktions-Beiträge (pro Account, nicht pro Charakter).
create table if not exists public.redaktion_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redaktion_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create index if not exists redaktion_reactions_post_idx on public.redaktion_reactions (post_id);

alter table public.redaktion_reactions enable row level security;

drop policy if exists "redaktion_reactions_select_if_post_visible" on public.redaktion_reactions;
create policy "redaktion_reactions_select_if_post_visible" on public.redaktion_reactions
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

drop policy if exists "redaktion_reactions_insert_own" on public.redaktion_reactions;
create policy "redaktion_reactions_insert_own" on public.redaktion_reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

drop policy if exists "redaktion_reactions_delete_own" on public.redaktion_reactions;
create policy "redaktion_reactions_delete_own" on public.redaktion_reactions
  for delete to authenticated using (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- Charakterprofil im Stil des Redaktions-Profils: Banner, Status-Zeile und eigene Felder.
alter table public.characters add column if not exists banner_url text;
alter table public.characters add column if not exists status_text text;
alter table public.characters add column if not exists custom_fields jsonb not null default '[]'::jsonb;

alter table public.characters drop constraint if exists characters_profile_limits;
alter table public.characters add constraint characters_profile_limits check (
  char_length(coalesce(status_text, '')) <= 80
  and jsonb_typeof(custom_fields) = 'array'
  and jsonb_array_length(custom_fields) <= 12
);


-- ---------------------------------------------------------------------------
-- Eigene Emojis pro Welt (wie Discord-Server-Emojis): Mitglieder laden Bilder hoch und nutzen sie als :name: in Texten.
create table if not exists public.custom_emojis (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9_]{2,32}$'),
  image_url text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists custom_emojis_world_name_idx on public.custom_emojis (world_id, name);

alter table public.custom_emojis enable row level security;

drop policy if exists "custom_emojis_select_member" on public.custom_emojis;
create policy "custom_emojis_select_member" on public.custom_emojis
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "custom_emojis_insert_member" on public.custom_emojis;
create policy "custom_emojis_insert_member" on public.custom_emojis
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

drop policy if exists "custom_emojis_delete_own_or_world_owner" on public.custom_emojis;
create policy "custom_emojis_delete_own_or_world_owner" on public.custom_emojis
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- Badges: eigene/verliehene Badges pro Welt (badge_defs) und alle vergebenen Badges (badge_awards).
-- badge_key: 'auto:<schlüssel>' (automatische Erfolge eines Charakters), 'account:<schlüssel>' (Redaktions-Abzeichen eines Accounts),
-- 'custom:<def-id>' (von Mitgliedern gestaltete bzw. von der Spielleitung verliehene Badges).
create table if not exists public.badge_defs (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  description text check (char_length(coalesce(description, '')) <= 200),
  icon text not null check (char_length(icon) between 1 and 40),
  color text not null default '#96565d' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists badge_defs_world_idx on public.badge_defs (world_id);

create table if not exists public.badge_awards (
  id uuid primary key default gen_random_uuid(),
  badge_key text not null,
  character_id uuid references public.characters (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  def_id uuid references public.badge_defs (id) on delete cascade,
  awarded_by uuid references public.profiles (id) on delete set null,
  awarded_at timestamptz not null default now(),
  constraint badge_awards_one_recipient check ((character_id is not null) <> (user_id is not null))
);

create unique index if not exists badge_awards_character_key_idx on public.badge_awards (badge_key, character_id) where character_id is not null;
create unique index if not exists badge_awards_user_key_idx on public.badge_awards (badge_key, user_id) where user_id is not null;
create index if not exists badge_awards_character_idx on public.badge_awards (character_id);
create index if not exists badge_awards_user_idx on public.badge_awards (user_id);

alter table public.characters add column if not exists featured_badge_id uuid references public.badge_awards (id) on delete set null;
alter table public.profiles add column if not exists featured_badge_id uuid references public.badge_awards (id) on delete set null;

alter table public.badge_defs enable row level security;
alter table public.badge_awards enable row level security;

drop policy if exists "badge_defs_select_member" on public.badge_defs;
create policy "badge_defs_select_member" on public.badge_defs
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "badge_defs_insert_member" on public.badge_defs;
create policy "badge_defs_insert_member" on public.badge_defs
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

drop policy if exists "badge_defs_update_own" on public.badge_defs;
create policy "badge_defs_update_own" on public.badge_defs
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "badge_defs_delete_own_or_world_owner" on public.badge_defs;
create policy "badge_defs_delete_own_or_world_owner" on public.badge_defs
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

drop policy if exists "badge_awards_select_visible" on public.badge_awards;
create policy "badge_awards_select_visible" on public.badge_awards
  for select to authenticated using (
    (character_id is not null and exists (
      select 1 from public.characters c where c.id = character_id and public.is_world_member(c.world_id)
    ))
    or (user_id is not null and (user_id = auth.uid() or public.is_friend_of(user_id)))
  );

drop policy if exists "badge_awards_insert" on public.badge_awards;
create policy "badge_awards_insert" on public.badge_awards
  for insert to authenticated with check (
    (badge_key like 'auto:%' and character_id is not null and awarded_by is null and exists (
      select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()
    ))
    or (badge_key like 'account:%' and user_id = auth.uid() and awarded_by is null)
    or (badge_key like 'custom:%' and character_id is not null and def_id is not null and awarded_by = auth.uid() and exists (
      select 1
      from public.badge_defs d
      join public.characters c on c.world_id = d.world_id
      where d.id = def_id and c.id = character_id
        and (d.created_by = auth.uid() or exists (select 1 from public.worlds w where w.id = d.world_id and w.created_by = auth.uid()))
    ))
  );

drop policy if exists "badge_awards_delete" on public.badge_awards;
create policy "badge_awards_delete" on public.badge_awards
  for delete to authenticated using (
    awarded_by = auth.uid()
    or user_id = auth.uid()
    or exists (
      select 1 from public.characters c
      left join public.worlds w on w.id = c.world_id
      where c.id = character_id and (c.owner_id = auth.uid() or w.created_by = auth.uid())
    )
  );


-- Redaktions-Reaktionen dürfen auch eigene Emojis (:name:) sein; dafür reicht die alte Grenze von 16 Zeichen nicht.
alter table public.redaktion_reactions drop constraint if exists redaktion_reactions_emoji_check;
alter table public.redaktion_reactions
  add constraint redaktion_reactions_emoji_check check (char_length(emoji) between 1 and 40);

-- ---------------------------------------------------------------------------
-- Badges pro Stück ausblenden: ausgeblendete Badges erscheinen nicht im Profil, in der Sammlung anderer und im Verlauf.
alter table public.badge_awards add column if not exists hidden boolean not null default false;

-- Besitzer:innen (Charakter bzw. Account) dürfen nur die Spalte "hidden" ändern.
revoke update on public.badge_awards from authenticated, anon;
grant update (hidden) on public.badge_awards to authenticated;

drop policy if exists "badge_awards_update_hidden" on public.badge_awards;
create policy "badge_awards_update_hidden" on public.badge_awards
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );


-- ---------------------------------------------------------------------------
-- Standard-Schrift im Konto (statt nur im Browser): gilt für neuen Text im Editor auf allen Geräten.
alter table public.profiles add column if not exists default_font text;
alter table public.profiles drop constraint if exists profiles_default_font_format;
alter table public.profiles add constraint profiles_default_font_format check (default_font is null or default_font ~ '^[a-zA-Z0-9]{1,40}$');


-- ---------------------------------------------------------------------------
-- Benachrichtigungen bündeln: mehrere Kommentare, Story-Likes und Reaktionen auf dasselbe Ziel, solange die
-- vorige noch ungelesen ist, ergeben eine Benachrichtigung ("X und 4 weitere ..."). Gefällt-mir-Meldungen
-- wurden schon vorher gebündelt (migration_like_notifications.sql); diese Funktion übernimmt das und erweitert es.
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_name text,
  p_actor_avatar_url text,
  p_link text,
  p_message text,
  p_recipient_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_type = 'like' then
    insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name, actor_count)
    values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name, 1)
    on conflict (user_id, link, type, message) where (type = 'like' and read_at is null)
    do update set
      actor_name = excluded.actor_name,
      actor_avatar_url = excluded.actor_avatar_url,
      recipient_name = excluded.recipient_name,
      actor_count = case
        when public.notifications.actor_name = excluded.actor_name then public.notifications.actor_count
        else public.notifications.actor_count + 1
      end,
      created_at = now();
  elsif p_type in ('story_like', 'comment', 'redaktion_comment', 'redaktion_reaction') then
    -- Reaktionen mit unterschiedlichem Emoji gehören zusammen; die Meldung wird dann allgemein.
    update public.notifications n set
      actor_name = p_actor_name,
      actor_avatar_url = p_actor_avatar_url,
      recipient_name = p_recipient_name,
      actor_count = case when n.actor_name = p_actor_name then n.actor_count else n.actor_count + 1 end,
      message = case
        when n.type = 'redaktion_reaction' and n.message <> p_message then 'hat auf deinen Redaktions-Beitrag reagiert'
        else n.message
      end,
      created_at = now()
    where n.id = (
      select id from public.notifications
      where user_id = p_user_id and link = p_link and type = p_type and read_at is null
        and (p_type = 'redaktion_reaction' or message = p_message)
      order by created_at desc
      limit 1
    )
    returning n.id into v_id;
    if v_id is null then
      insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name, actor_count)
      values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name, 1);
    end if;
  else
    insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name)
    values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name);
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- Welcher Charakter hat ein Badge verliehen? ("Verliehen von Mira", Benachrichtigung "Mira hat dir das Badge ... verliehen")
alter table public.badge_awards add column if not exists awarded_by_character_id uuid references public.characters (id) on delete set null;


-- ---------------------------------------------------------------------------
-- Frei gewähltes Zeichen neben dem Namen (Emoji, Symbol oder eigenes Emoji :name:), pro Charakter und pro Redaktions-Profil.
alter table public.characters add column if not exists name_symbol text;
alter table public.redaktion_profiles add column if not exists name_symbol text;

alter table public.characters drop constraint if exists characters_name_symbol_len;
alter table public.characters add constraint characters_name_symbol_len check (name_symbol is null or char_length(name_symbol) <= 40);
alter table public.redaktion_profiles drop constraint if exists redaktion_profiles_name_symbol_len;
alter table public.redaktion_profiles add constraint redaktion_profiles_name_symbol_len check (name_symbol is null or char_length(name_symbol) <= 40);

-- Sicherheits-Härtung (Oktober 2026)
-- 1) Interne Funktionen waren ohne Login aufrufbar (Supabase gibt neuen Funktionen standardmäßig EXECUTE an anon).
--    Jetzt nur noch angemeldet; ohne Login bleiben nur Registrierung (username_available), Login (get_email_for_username)
--    und der Cron-Aufruf (digest_due, mit Geheimnis) offen.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.username_available(text, uuid) to anon;
grant execute on function public.digest_due(text) to anon;
grant execute on function public.get_email_for_username(text) to anon;

-- Künftige Funktionen sind ebenfalls nicht für anon freigegeben (bei Bedarf gezielt „grant execute … to anon“).
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public grant execute on functions to authenticated;

-- 2) E-Mail zu Benutzername nur noch mit Server-Geheimnis (gleiches Geheimnis wie digest_due / CRON_SECRET).
--    Die alte Variante ohne Geheimnis liefert jeder Person die E-Mail-Adresse und wird danach entfernt:
--    drop function public.get_email_for_username(text);
create or replace function public.get_email_for_username(p_username text, p_secret text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if p_secret is distinct from (select value from public.app_secrets where key = 'cron') then
    raise exception 'Nicht erlaubt';
  end if;
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
  return v_email;
end;
$$;

grant execute on function public.get_email_for_username(text, text) to anon, authenticated;

-- 3) Storage: Ändern/Löschen nur noch an eigenen Dateien (bisher durfte jede angemeldete Person fremde Dateien löschen).
alter policy "avatars_authenticated_update" on storage.objects
  using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);
alter policy "avatars_authenticated_delete" on storage.objects
  using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);
alter policy "post_images_authenticated_delete" on storage.objects
  using (bucket_id = 'post-images' and owner_id = (select auth.uid())::text);
alter policy "wiki_covers_authenticated_update" on storage.objects
  using (bucket_id = 'wiki-covers' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'wiki-covers' and owner_id = (select auth.uid())::text);
alter policy "wiki_covers_authenticated_delete" on storage.objects
  using (bucket_id = 'wiki-covers' and owner_id = (select auth.uid())::text);
alter policy "world_covers_authenticated_update" on storage.objects
  using (bucket_id = 'world-covers' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'world-covers' and owner_id = (select auth.uid())::text);
alter policy "world_covers_authenticated_delete" on storage.objects
  using (bucket_id = 'world-covers' and owner_id = (select auth.uid())::text);

-- Wiki: Jedes Mitglied der Welt darf jeden Eintrag bearbeiten (nicht nur Ersteller:in und Welt-Besitzer:in).
-- Löschen bleibt bei Ersteller:in und Welt-Besitzer:in.
drop policy if exists "wiki_pages_update_own_or_world_owner" on public.wiki_pages;
drop policy if exists "wiki_pages_update_member" on public.wiki_pages;
create policy "wiki_pages_update_member" on public.wiki_pages
  for update to authenticated
  using (public.is_world_member(world_id))
  with check (public.is_world_member(world_id));

-- Beziehungsnetz: eigene Daten ("gilt seit …") pro Verlaufsschritt.
alter table public.relationship_history add column if not exists occurred_on date;
-- Datum, das beim Anlegen/Weiterentwickeln mitgeschickt wird (wie change_note); der Trigger übernimmt es in den Verlauf.
alter table public.character_relationships add column if not exists change_date date;

create or replace function public.log_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by, occurred_on)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, null, auth.uid(), new.change_date);
  elsif new.type is distinct from old.type
     or new.category is distinct from old.category
     or new.color is distinct from old.color
     or new.label is distinct from old.label then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by, occurred_on)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, new.change_note, auth.uid(), new.change_date);
    new.change_note := null;
    new.change_date := null;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Datum und Notiz eines vorhandenen Verlaufsschritts nachträglich ändern (wer die Beziehung bearbeiten darf).
create or replace function public.update_relationship_step(p_step_id uuid, p_occurred_on date, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel uuid;
begin
  select relationship_id into v_rel from public.relationship_history where id = p_step_id;
  if v_rel is null then
    raise exception 'Schritt nicht gefunden';
  end if;
  if not exists (
    select 1 from public.character_relationships r
    where r.id = v_rel
      and (
        r.created_by = auth.uid()
        or exists (select 1 from public.worlds w where w.id = r.world_id and w.created_by = auth.uid())
        or exists (
          select 1 from public.characters c
          where c.id in (r.character_a_id, r.character_b_id) and c.owner_id = auth.uid()
        )
      )
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.relationship_history
    set occurred_on = p_occurred_on, note = nullif(left(coalesce(p_note, ''), 300), '')
    where id = p_step_id;
end;
$$;

grant execute on function public.update_relationship_step(uuid, date, text) to authenticated;


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


-- Wiki: Typ einer Seite (Ort, Spezies, Organisation, ...). Optional; bestehende Seiten bleiben ohne Typ.
alter table public.wiki_pages add column if not exists page_type text;
alter table public.wiki_pages drop constraint if exists wiki_pages_page_type_check;
alter table public.wiki_pages add constraint wiki_pages_page_type_check
  check (page_type is null or page_type in ('ort','spezies','organisation','person','ereignis','mythos','gegenstand'));
create index if not exists wiki_pages_type_idx on public.wiki_pages (world_id, page_type);


-- Wiki Runde 3: Tags, Entwürfe, Favoriten.
-- Entwürfe sieht nur, wer sie angelegt hat; alle anderen Mitglieder sehen die Seite erst nach dem Veröffentlichen.
alter table public.wiki_pages add column if not exists tags text[] not null default '{}';
alter table public.wiki_pages add column if not exists is_draft boolean not null default false;
create index if not exists wiki_pages_tags_idx on public.wiki_pages using gin (tags);

-- Bestehende Regel direkt ändern (kein DROP, daher ohne Lücke, in der niemand etwas sieht).
alter policy "wiki_pages_select_member" on public.wiki_pages
  using (is_world_member(world_id) and (not is_draft or created_by = auth.uid()));

create table if not exists public.wiki_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);
alter table public.wiki_favorites enable row level security;
drop policy if exists "wiki_favorites_select_own" on public.wiki_favorites;
create policy "wiki_favorites_select_own" on public.wiki_favorites for select using (user_id = auth.uid());
drop policy if exists "wiki_favorites_insert_own" on public.wiki_favorites;
create policy "wiki_favorites_insert_own" on public.wiki_favorites for insert with check (user_id = auth.uid());
drop policy if exists "wiki_favorites_delete_own" on public.wiki_favorites;
create policy "wiki_favorites_delete_own" on public.wiki_favorites for delete using (user_id = auth.uid());
grant select, insert, delete on public.wiki_favorites to authenticated;



-- Wiki Runde 4: Karten mit Markierungen (Pins). Ein Pin kann auf eine Wiki-Seite oder auf eine weitere Karte zeigen.
-- Das Kartenbild liegt im Bucket wiki-covers (Pfad maps/...). Mitglieder der Welt dürfen Karten und Pins bearbeiten (wie Wiki-Seiten);
-- Karten löschen dürfen nur, wer sie angelegt hat, und die Welt-Besitzerin.
create table if not exists public.wiki_maps (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  image_url text not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wiki_maps_world_idx on public.wiki_maps (world_id);

create table if not exists public.wiki_map_pins (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references public.wiki_maps (id) on delete cascade,
  x numeric(6, 3) not null check (x between 0 and 100),
  y numeric(6, 3) not null check (y between 0 and 100),
  label text not null check (char_length(label) between 1 and 80),
  icon text check (icon is null or char_length(icon) <= 40),
  page_id uuid references public.wiki_pages (id) on delete set null,
  target_map_id uuid references public.wiki_maps (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists wiki_map_pins_map_idx on public.wiki_map_pins (map_id);
create index if not exists wiki_map_pins_page_idx on public.wiki_map_pins (page_id);

-- Pins zeigen nur auf Seiten und Karten derselben Welt.
create or replace function public.wiki_map_pin_check() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.page_id is not null and not exists (
    select 1 from wiki_pages p join wiki_maps m on m.id = new.map_id where p.id = new.page_id and p.world_id = m.world_id
  ) then
    raise exception 'Die Seite gehört nicht zur Welt dieser Karte.';
  end if;
  if new.target_map_id is not null and not exists (
    select 1 from wiki_maps t join wiki_maps m on m.id = new.map_id where t.id = new.target_map_id and t.world_id = m.world_id
  ) then
    raise exception 'Die Zielkarte gehört nicht zur Welt dieser Karte.';
  end if;
  if new.target_map_id = new.map_id then
    raise exception 'Ein Pin kann nicht auf die eigene Karte zeigen.';
  end if;
  return new;
end $$;
drop trigger if exists wiki_map_pin_check on public.wiki_map_pins;
create trigger wiki_map_pin_check before insert or update on public.wiki_map_pins
  for each row execute function public.wiki_map_pin_check();

alter table public.wiki_maps enable row level security;
alter table public.wiki_map_pins enable row level security;

drop policy if exists "wiki_maps_select_member" on public.wiki_maps;
create policy "wiki_maps_select_member" on public.wiki_maps for select using (is_world_member(world_id));
drop policy if exists "wiki_maps_insert_member" on public.wiki_maps;
create policy "wiki_maps_insert_member" on public.wiki_maps for insert with check (created_by = auth.uid() and is_world_member(world_id));
drop policy if exists "wiki_maps_update_member" on public.wiki_maps;
create policy "wiki_maps_update_member" on public.wiki_maps for update using (is_world_member(world_id)) with check (is_world_member(world_id));
drop policy if exists "wiki_maps_delete_own_or_world_owner" on public.wiki_maps;
create policy "wiki_maps_delete_own_or_world_owner" on public.wiki_maps for delete using (
  created_by = auth.uid() or exists (select 1 from worlds w where w.id = wiki_maps.world_id and w.created_by = auth.uid())
);

drop policy if exists "wiki_map_pins_select_member" on public.wiki_map_pins;
create policy "wiki_map_pins_select_member" on public.wiki_map_pins for select using (
  exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id))
);
drop policy if exists "wiki_map_pins_insert_member" on public.wiki_map_pins;
create policy "wiki_map_pins_insert_member" on public.wiki_map_pins for insert with check (
  created_by = auth.uid() and exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id))
);
drop policy if exists "wiki_map_pins_update_member" on public.wiki_map_pins;
create policy "wiki_map_pins_update_member" on public.wiki_map_pins for update
  using (exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id)))
  with check (exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id)));
drop policy if exists "wiki_map_pins_delete_member" on public.wiki_map_pins;
create policy "wiki_map_pins_delete_member" on public.wiki_map_pins for delete using (
  exists (select 1 from wiki_maps m where m.id = map_id and is_world_member(m.world_id))
);

grant select, insert, update, delete on public.wiki_maps, public.wiki_map_pins to authenticated;



-- Wiki Runde 8: Zeitpunkt an Wiki-Seiten (z. B. Ereignisse) und ein frei einstellbarer Kalender je Welt.
-- Daten sind teilweise möglich (nur Jahr; Jahr und Monat; ganzes Datum) und können einen Zeitraum (Ende) haben.
alter table public.wiki_pages add column if not exists event_year integer;
alter table public.wiki_pages add column if not exists event_month smallint;
alter table public.wiki_pages add column if not exists event_day smallint;
alter table public.wiki_pages add column if not exists event_end_year integer;
alter table public.wiki_pages add column if not exists event_end_month smallint;
alter table public.wiki_pages add column if not exists event_end_day smallint;
alter table public.wiki_pages add constraint wiki_pages_event_ranges check (
  (event_month is null or event_month between 1 and 99) and (event_day is null or event_day between 1 and 999)
  and (event_end_month is null or event_end_month between 1 and 99) and (event_end_day is null or event_end_day between 1 and 999)
);
create index if not exists wiki_pages_event_idx on public.wiki_pages (world_id, event_year) where event_year is not null;

-- Kalender der Welt: Liste der Monate (Name, Anzahl Tage) und eine Bezeichnung für die Jahreszählung (z. B. „n. d. Zeitenwende“).
create table if not exists public.wiki_calendars (
  world_id uuid primary key references public.worlds (id) on delete cascade,
  months jsonb not null,
  era text check (era is null or char_length(era) <= 40),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.wiki_calendars enable row level security;
drop policy if exists "wiki_calendars_select_member" on public.wiki_calendars;
create policy "wiki_calendars_select_member" on public.wiki_calendars for select using (is_world_member(world_id));
drop policy if exists "wiki_calendars_insert_member" on public.wiki_calendars;
create policy "wiki_calendars_insert_member" on public.wiki_calendars for insert with check (is_world_member(world_id) and updated_by = auth.uid());
drop policy if exists "wiki_calendars_update_member" on public.wiki_calendars;
create policy "wiki_calendars_update_member" on public.wiki_calendars for update using (is_world_member(world_id)) with check (is_world_member(world_id));
grant select, insert, update on public.wiki_calendars to authenticated;


-- Wiki: Icon (durchsichtig, nicht zugeschnitten) zusätzlich zum Titelbild
alter table public.wiki_pages add column if not exists icon_url text check (icon_url is null or char_length(icon_url) <= 500);


-- Wiki-Ordner: frei wählbares Icon (Emoji oder :eigenes:) und Farbe aus einer festen Auswahl.
alter table public.wiki_folders add column if not exists icon text check (icon is null or char_length(icon) <= 40);
alter table public.wiki_folders add column if not exists color text check (color is null or color in ('rose','peach','gold','sage','teal','sky','slate','plum','gray'));

-- Wiki: Seitenarten (Ort, Spezies, ...) als Daten pro Welt. Alle Mitglieder dürfen eigene anlegen und bearbeiten;
-- löschen dürfen die Ersteller:in und die Welt-Besitzer:in (die mitgelieferten Arten gehören der Welt-Besitzer:in).
create table if not exists public.wiki_types (
  world_id uuid not null references public.worlds (id) on delete cascade,
  id text not null check (id ~ '^[a-z0-9_]{1,40}$'),
  label text not null check (char_length(label) between 1 and 40),
  plural text not null check (char_length(plural) between 1 and 60),
  icon text not null default 'file-text' check (char_length(icon) <= 40),
  color text check (color is null or color in ('rose','peach','gold','sage','teal','sky','slate','plum','gray')),
  hint text not null default '' check (char_length(hint) <= 120),
  fields text[] not null default '{}' check (cardinality(fields) <= 20),
  outline text[] not null default '{}' check (cardinality(outline) <= 20),
  portrait boolean not null default false,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (world_id, id)
);

-- Der feste Katalog an Seitenarten gilt nicht mehr.
alter table public.wiki_pages drop constraint if exists wiki_pages_page_type_check;
alter table public.wiki_pages add constraint wiki_pages_page_type_check
  check (page_type is null or page_type ~ '^[a-z0-9_]{1,40}$');

alter table public.wiki_types enable row level security;

drop policy if exists "wiki_types_select_member" on public.wiki_types;
create policy "wiki_types_select_member" on public.wiki_types
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "wiki_types_insert_member" on public.wiki_types;
create policy "wiki_types_insert_member" on public.wiki_types
  for insert to authenticated with check (public.is_world_member(world_id) and created_by = auth.uid());

drop policy if exists "wiki_types_update_member" on public.wiki_types;
create policy "wiki_types_update_member" on public.wiki_types
  for update to authenticated
  using (public.is_world_member(world_id))
  with check (public.is_world_member(world_id));

grant select, insert, update on public.wiki_types to authenticated;

-- Mitgelieferte Arten für eine Welt anlegen (nur intern, nicht aufrufbar).
create or replace function public.seed_wiki_types(p_world uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select created_by into v_owner from public.worlds where id = p_world;
  insert into public.wiki_types (world_id, id, label, plural, icon, color, hint, fields, outline, portrait, sort_order, created_by) values
    (p_world, 'ort', 'Ort', 'Orte', 'map-pin', 'sage', 'Städte, Landschaften, Gebäude',
      array['Art des Ortes','Lage','Einwohner','Herrschaft','Gegründet'], array['Beschreibung','Geschichte','Bewohner','Sehenswertes','Gerüchte'], false, 1, v_owner),
    (p_world, 'spezies', 'Spezies / Wesen', 'Spezies und Wesen', 'paw-print', 'peach', 'Völker, Rassen, Kreaturen',
      array['Art','Entstehung','Lebensdauer','Fähigkeiten','Schwäche'], array['Aussehen','Fähigkeiten und Schwächen','Lebensweise','Geschichte','Mythen und Irrtümer'], false, 2, v_owner),
    (p_world, 'organisation', 'Organisation / Haus', 'Organisationen und Häuser', 'users', 'plum', 'Fraktionen, Familien, Gruppen',
      array['Anführer:in','Sitz','Mitglieder','Gegründet','Ziele'], array['Überblick','Geschichte','Aufbau und Ränge','Mitglieder','Ziele und Gegner'], false, 3, v_owner),
    (p_world, 'person', 'Person', 'Personen', 'user', 'sky', 'Figuren der Welt, die keine Spielfigur sind',
      array['Alter','Beruf','Wohnort','Familie'], array['Wer ist die Person?','Lebensweg','Beziehungen','Geheimnisse'], true, 4, v_owner),
    (p_world, 'ereignis', 'Ereignis', 'Ereignisse', 'calendar-days', 'rose', 'Schlachten, Feste, Wendepunkte',
      array['Datum','Ort','Beteiligte','Folgen'], array['Was geschah?','Vorgeschichte','Ablauf','Folgen'], false, 5, v_owner),
    (p_world, 'mythos', 'Mythos', 'Mythen', 'scroll-text', 'gold', 'Legenden, Religionen, Bräuche',
      array['Herkunft','Verbreitung','Wahrheitsgehalt'], array['Die Erzählung','Ursprung','Deutungen','Was wirklich dahintersteckt'], false, 6, v_owner),
    (p_world, 'gegenstand', 'Gegenstand', 'Gegenstände', 'gem', 'slate', 'Waffen, Artefakte, Besonderes',
      array['Art','Besitzer:in','Herkunft','Wirkung'], array['Beschreibung','Geschichte','Kräfte und Preis','Aufenthaltsort'], false, 7, v_owner)
  on conflict (world_id, id) do nothing;
end;
$$;

revoke all on function public.seed_wiki_types(uuid) from public, anon, authenticated;

create or replace function public.seed_wiki_types_for_new_world()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_wiki_types(new.id);
  return new;
end;
$$;

revoke all on function public.seed_wiki_types_for_new_world() from public, anon, authenticated;

drop trigger if exists wiki_types_seed_trg on public.worlds;
create trigger wiki_types_seed_trg after insert on public.worlds
  for each row execute procedure public.seed_wiki_types_for_new_world();

-- Bestehende Welten bekommen die mitgelieferten Arten.
select public.seed_wiki_types(id) from public.worlds;

-- Art löschen: Seiten dieser Art verlieren nur ihre Art (Inhalt bleibt). Ersteller:in oder Welt-Besitzer:in.
create or replace function public.delete_wiki_type(p_world uuid, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_owner uuid;
begin
  select created_by into v_creator from public.wiki_types where world_id = p_world and id = p_id;
  if not found then
    raise exception 'Seitenart nicht gefunden';
  end if;
  select created_by into v_owner from public.worlds where id = p_world;
  if not (v_creator = auth.uid() or v_owner = auth.uid()) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.wiki_pages set page_type = null where world_id = p_world and page_type = p_id;
  delete from public.wiki_types where world_id = p_world and id = p_id;
end;
$$;

revoke all on function public.delete_wiki_type(uuid, text) from public, anon;
grant execute on function public.delete_wiki_type(uuid, text) to authenticated;


-- Story: selbst geschriebene Zusammenfassung pro Szene (zum Nachlesen). Getrennt von ai_summary (KI) und den Kapitelzeilen.
alter table public.story_posts
  add column if not exists recap text check (recap is null or char_length(recap) <= 8000),
  add column if not exists recap_by uuid references public.profiles (id) on delete set null,
  add column if not exists recap_at timestamptz;

-- Kurzzeitig gebaute Kapitel-Zusammenfassungen (ersetzt durch Szenen-Zusammenfassungen).
drop function if exists public.set_chapter_recap(uuid, text);
alter table public.story_entries
  drop column if exists chapter_recap,
  drop column if exists chapter_recap_by,
  drop column if exists chapter_recap_at;

-- Jede Person mit einem Charakter in der Welt (und die Welt-Besitzer:in) darf die Zusammenfassung einer Szene schreiben, ändern oder
-- (leerer Text) entfernen. Normale Änderungen an der Szene bleiben auf die Autor:in beschränkt.
create or replace function public.set_scene_recap(p_story_post_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
begin
  select world_id into v_world from public.story_posts where id = p_story_post_id;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not (
    exists (select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world)
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if v_text is not null and char_length(v_text) > 8000 then
    raise exception 'Die Zusammenfassung ist zu lang (höchstens 8000 Zeichen).';
  end if;
  update public.story_posts
    set recap = v_text,
        recap_by = case when v_text is null then null else auth.uid() end,
        recap_at = case when v_text is null then null else now() end
    where id = p_story_post_id;
end;
$$;

revoke all on function public.set_scene_recap(uuid, text) from public, anon;
grant execute on function public.set_scene_recap(uuid, text) to authenticated;


-- Feed pro Welt: Mitglieder einer Welt sehen alle Beiträge der Charaktere dieser Welt, und alle Charaktere einer Welt folgen sich automatisch.

-- Beiträge: sichtbar für alle Mitglieder der Welt, zu der der Charakter gehört (zusätzlich zu den bisherigen Regeln für Freund:innen und gefolgte Welten).
create or replace function public.is_world_member_character(_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.characters c
    where c.id = _character_id and public.is_world_member(c.world_id)
  );
$$;

revoke all on function public.is_world_member_character(uuid) from public, anon;
grant execute on function public.is_world_member_character(uuid) to authenticated;

drop policy if exists "posts_select_world_member" on public.posts;
create policy "posts_select_world_member" on public.posts
  for select to authenticated using (public.is_world_member_character(character_id));

-- Automatisch folgen: bestehende Charaktere einer Welt folgen einander ...
insert into public.character_follows (follower_id, followed_id)
select a.id, b.id
from public.characters a
join public.characters b on b.world_id = a.world_id and b.id <> a.id
on conflict do nothing;

-- ... und jeder neue Charakter folgt allen anderen der Welt und wird von allen gefolgt (Entfolgen bleibt danach möglich).
create or replace function public.autofollow_world_characters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.character_follows (follower_id, followed_id)
  select new.id, c.id from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  insert into public.character_follows (follower_id, followed_id)
  select c.id, new.id from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.autofollow_world_characters() from public, anon, authenticated;

drop trigger if exists characters_autofollow_trg on public.characters;
create trigger characters_autofollow_trg after insert on public.characters
  for each row execute procedure public.autofollow_world_characters();


-- Szenen-Zusammenfassung ist jetzt formatierter Text (HTML wie bei den anderen Texten), daher größeres Zeichenlimit.
alter table public.story_posts drop constraint if exists story_posts_recap_check;
alter table public.story_posts add constraint story_posts_recap_check check (recap is null or char_length(recap) <= 30000);

create or replace function public.set_scene_recap(p_story_post_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
begin
  select world_id into v_world from public.story_posts where id = p_story_post_id;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not (
    exists (select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world)
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if v_text is not null and char_length(v_text) > 30000 then
    raise exception 'Die Zusammenfassung ist zu lang.';
  end if;
  update public.story_posts
    set recap = v_text,
        recap_by = case when v_text is null then null else auth.uid() end,
        recap_at = case when v_text is null then null else now() end
    where id = p_story_post_id;
end;
$$;

revoke all on function public.set_scene_recap(uuid, text) from public, anon;
grant execute on function public.set_scene_recap(uuid, text) to authenticated;


-- Automatische Folgen (Welt-Automatik) von Hand gesetzten Folgen unterscheiden, damit sie bei den Follower-Badges nicht mitzählen.
alter table public.character_follows add column if not exists auto boolean not null default false;

-- Die einmalige Nachfüllung vom 3.10.2026 (17:52 UTC) war automatisch.
update public.character_follows set auto = true
where created_at >= '2026-10-03 17:52:00+00' and created_at < '2026-10-03 17:53:00+00';

create or replace function public.autofollow_world_characters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.character_follows (follower_id, followed_id, auto)
  select new.id, c.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  insert into public.character_follows (follower_id, followed_id, auto)
  select c.id, new.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.autofollow_world_characters() from public, anon, authenticated;



-- Szenen bekommen einen Zeitpunkt im Kalender der Welt (wie Wiki-Seiten), damit sie gemeinsam mit der Weltgeschichte auf der Zeitleiste stehen.
-- Teilweise Daten sind möglich (nur Jahr; Jahr und Monat) und ein Zeitraum (Ende). Das Freitextfeld in_world_time bleibt als Zusatz („Abenddämmerung“).
alter table public.story_posts add column if not exists event_year integer;
alter table public.story_posts add column if not exists event_month smallint;
alter table public.story_posts add column if not exists event_day smallint;
alter table public.story_posts add column if not exists event_end_year integer;
alter table public.story_posts add column if not exists event_end_month smallint;
alter table public.story_posts add column if not exists event_end_day smallint;
alter table public.story_posts drop constraint if exists story_posts_event_ranges;
alter table public.story_posts add constraint story_posts_event_ranges check (
  (event_month is null or event_month between 1 and 99) and (event_day is null or event_day between 1 and 999)
  and (event_end_month is null or event_end_month between 1 and 99) and (event_end_day is null or event_end_day between 1 and 999)
);
create index if not exists story_posts_event_idx on public.story_posts (world_id, event_year) where event_year is not null;


-- Das Datum einer Szene dürfen alle ändern, die in der Welt mitspielen (wie die Zusammenfassung), nicht nur die Autor:in.
create or replace function public.set_scene_dates(
  p_story_post_id uuid,
  p_year integer, p_month smallint, p_day smallint,
  p_end_year integer, p_end_month smallint, p_end_day smallint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
begin
  select world_id into v_world from public.story_posts where id = p_story_post_id;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not (
    exists (select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world)
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.story_posts
    set event_year = p_year, event_month = p_month, event_day = p_day,
        event_end_year = p_end_year, event_end_month = p_end_month, event_end_day = p_end_day
    where id = p_story_post_id;
end;
$$;

revoke all on function public.set_scene_dates(uuid, integer, smallint, smallint, integer, smallint, smallint) from public, anon;
grant execute on function public.set_scene_dates(uuid, integer, smallint, smallint, integer, smallint, smallint) to authenticated;


-- Bezeichnung zum Datum einer Wiki-Seite („Geboren“, „Gegründet“, „Gestorben“ …); eine für den Anfang, eine für das Ende des Zeitraums.
alter table public.wiki_pages add column if not exists event_label text;
alter table public.wiki_pages add column if not exists event_end_label text;
alter table public.wiki_pages drop constraint if exists wiki_pages_event_labels_len;
alter table public.wiki_pages add constraint wiki_pages_event_labels_len check (
  (event_label is null or char_length(event_label) <= 40) and (event_end_label is null or char_length(event_end_label) <= 40)
);


-- Charakterbogen („ChaBo“) pro Charakter: Attribute, Talente, persönliche Infos, Notizen, Bild.
-- Alles in einem JSON-Feld (Form wie der alte Charakterbogen), geprüft wird in der App (lib/sheet-rules.ts).
create table if not exists public.character_sheets (
  character_id uuid primary key references public.characters (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint character_sheets_size check (octet_length(data::text) <= 300000)
);

alter table public.character_sheets enable row level security;

drop policy if exists "character_sheets_select_world_member" on public.character_sheets;
create policy "character_sheets_select_world_member" on public.character_sheets
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheets.character_id and public.is_world_member(c.world_id))
  );

drop policy if exists "character_sheets_insert_owner" on public.character_sheets;
create policy "character_sheets_insert_owner" on public.character_sheets
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheets_update_owner" on public.character_sheets;
create policy "character_sheets_update_owner" on public.character_sheets
  for update to authenticated
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid()));

drop policy if exists "character_sheets_delete_owner" on public.character_sheets;
create policy "character_sheets_delete_owner" on public.character_sheets
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid())
  );

revoke all on public.character_sheets from anon;
grant select, insert, update, delete on public.character_sheets to authenticated;


-- Verlauf der Änderungen am ChaBo: wer hat wann welches Feld geändert (alter → neuer Wert).
-- Aufeinanderfolgende Änderungen am selben Feld durch dieselbe Person innerhalb weniger Minuten werden von der App zu einer Zeile zusammengefasst.
create table if not exists public.character_sheet_log (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  field_key text not null check (char_length(field_key) <= 80),
  field_label text not null check (char_length(field_label) <= 80),
  old_value text check (old_value is null or char_length(old_value) <= 200),
  new_value text check (new_value is null or char_length(new_value) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists character_sheet_log_recent_idx on public.character_sheet_log (updated_at desc);
create index if not exists character_sheet_log_char_idx on public.character_sheet_log (character_id, actor_id, updated_at desc);

alter table public.character_sheet_log enable row level security;

drop policy if exists "character_sheet_log_select_world_member" on public.character_sheet_log;
create policy "character_sheet_log_select_world_member" on public.character_sheet_log
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and public.is_world_member(c.world_id))
  );

drop policy if exists "character_sheet_log_insert_owner" on public.character_sheet_log;
create policy "character_sheet_log_insert_owner" on public.character_sheet_log
  for insert to authenticated with check (
    actor_id = auth.uid()
    and exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheet_log_update_own" on public.character_sheet_log;
create policy "character_sheet_log_update_own" on public.character_sheet_log
  for update to authenticated using (actor_id = auth.uid()) with check (actor_id = auth.uid());

drop policy if exists "character_sheet_log_delete_own" on public.character_sheet_log;
create policy "character_sheet_log_delete_own" on public.character_sheet_log
  for delete to authenticated using (actor_id = auth.uid());

revoke all on public.character_sheet_log from anon;
grant select, insert, update, delete on public.character_sheet_log to authenticated;


-- Geheime Felder und Notizen im ChaBo: liegen bewusst in einer eigenen Tabelle, die nur die Besitzer:in des Charakters lesen und schreiben kann.
-- (Der normale ChaBo in character_sheets ist für alle in der Welt lesbar; Geheimes darf dort nie stehen.)
create table if not exists public.character_sheet_secrets (
  character_id uuid primary key references public.characters (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint character_sheet_secrets_size check (octet_length(data::text) <= 300000)
);

alter table public.character_sheet_secrets enable row level security;

drop policy if exists "character_sheet_secrets_select_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_select_owner" on public.character_sheet_secrets
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheet_secrets_insert_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_insert_owner" on public.character_sheet_secrets
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheet_secrets_update_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_update_owner" on public.character_sheet_secrets
  for update to authenticated
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid()));

drop policy if exists "character_sheet_secrets_delete_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_delete_owner" on public.character_sheet_secrets
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid())
  );

revoke all on public.character_sheet_secrets from anon;
grant select, insert, update, delete on public.character_sheet_secrets to authenticated;


-- Zustand beim Würfeln (z. B. „Betrunken (stark)“): der Malus steckt schon im Bonus des Wurfs, hier steht nur die Bezeichnung für die Anzeige.
alter table public.story_entries add column if not exists roll_condition text;
alter table public.story_entries drop constraint if exists story_entries_roll_condition_len;
alter table public.story_entries add constraint story_entries_roll_condition_len check (roll_condition is null or char_length(roll_condition) <= 40);


-- Online-Status pro Account: „online“ = andere sehen dich, solange die App offen ist; „offline“ = du erscheinst für andere offline (manuell).
alter table public.profiles add column if not exists presence_mode text not null default 'online';
alter table public.profiles drop constraint if exists profiles_presence_mode_check;
alter table public.profiles add constraint profiles_presence_mode_check check (presence_mode in ('online', 'offline'));


-- NPCs: Charaktere ohne Spieler:in dahinter. `owner_id` bleibt die Person, die den NPC angelegt hat (Anleger:in).
-- Alle Mitglieder der Welt dürfen NPCs anlegen (bestehende Policy characters_insert_own). Bearbeiten und löschen dürfen Anleger:in und
-- die Besitzerin der Welt. Zwischen NPC und normalem Charakter umschalten darf nur die Anleger:in selbst. NPCs folgen und werden nicht
-- automatisch gefolgt.
alter table public.characters add column if not exists is_npc boolean not null default false;
create index if not exists characters_npc_idx on public.characters (world_id) where is_npc;

create or replace function public.is_world_owner(_world_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.worlds w where w.id = _world_id and w.created_by = auth.uid());
$$;
revoke all on function public.is_world_owner(uuid) from public, anon;
grant execute on function public.is_world_owner(uuid) to authenticated;

-- Welt-Besitzerin darf NPCs ändern und löschen (normale Charaktere bleiben ihren Besitzer:innen vorbehalten).
drop policy if exists "characters_update_world_owner_npc" on public.characters;
create policy "characters_update_world_owner_npc" on public.characters for update
  using (is_npc and public.is_world_owner(world_id)) with check (is_npc and public.is_world_owner(world_id));
drop policy if exists "characters_delete_world_owner_npc" on public.characters;
create policy "characters_delete_world_owner_npc" on public.characters for delete
  using (is_npc and public.is_world_owner(world_id));

-- Nur die Besitzer:in schaltet um und nur sie gibt den Charakter weiter (die Welt-Besitzerin darf also nichts davon).
create or replace function public.characters_npc_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and old.owner_id <> auth.uid() then
    if new.is_npc is distinct from old.is_npc then
      raise exception 'Nur die Person, die den Charakter angelegt hat, kann ihn zum NPC machen oder zurückverwandeln.';
    end if;
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Die Besitzer:in eines Charakters kann nur sie selbst ändern.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.characters_npc_guard() from public, anon;
grant execute on function public.characters_npc_guard() to authenticated;
drop trigger if exists characters_npc_guard_trg on public.characters;
create trigger characters_npc_guard_trg before update on public.characters
  for each row execute function public.characters_npc_guard();

-- Charakterbogen, Geheimes und Verlauf von NPCs darf auch die Welt-Besitzerin bearbeiten.
drop policy if exists "character_sheets_insert_world_owner_npc" on public.character_sheets;
create policy "character_sheets_insert_world_owner_npc" on public.character_sheets for insert with check (
  exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheets_update_world_owner_npc" on public.character_sheets;
create policy "character_sheets_update_world_owner_npc" on public.character_sheets for update
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheets_delete_world_owner_npc" on public.character_sheets;
create policy "character_sheets_delete_world_owner_npc" on public.character_sheets for delete using (
  exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)));

drop policy if exists "character_sheet_secrets_select_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_select_world_owner_npc" on public.character_sheet_secrets for select using (
  exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheet_secrets_insert_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_insert_world_owner_npc" on public.character_sheet_secrets for insert with check (
  exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheet_secrets_update_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_update_world_owner_npc" on public.character_sheet_secrets for update
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheet_secrets_delete_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_delete_world_owner_npc" on public.character_sheet_secrets for delete using (
  exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));

drop policy if exists "character_sheet_log_insert_world_owner_npc" on public.character_sheet_log;
create policy "character_sheet_log_insert_world_owner_npc" on public.character_sheet_log for insert with check (
  actor_id = auth.uid() and exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and c.is_npc and public.is_world_owner(c.world_id)));

-- Automatisches Folgen: NPCs werden nicht einbezogen.
create or replace function public.autofollow_world_characters() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_npc then
    return new;
  end if;
  insert into public.character_follows (follower_id, followed_id, auto)
  select new.id, c.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
  on conflict do nothing;
  insert into public.character_follows (follower_id, followed_id, auto)
  select c.id, new.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
  on conflict do nothing;
  return new;
end $$;

-- Wird ein Charakter zum NPC, verschwinden seine automatischen Folgen; wird ein NPC zum Charakter, bekommt er sie wie ein neuer.
create or replace function public.npc_toggle_follows() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_npc then
    delete from public.character_follows where auto and (follower_id = new.id or followed_id = new.id);
  else
    insert into public.character_follows (follower_id, followed_id, auto)
    select new.id, c.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
    on conflict do nothing;
    insert into public.character_follows (follower_id, followed_id, auto)
    select c.id, new.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.npc_toggle_follows() from public, anon;
grant execute on function public.npc_toggle_follows() to authenticated;
drop trigger if exists characters_npc_toggle_trg on public.characters;
create trigger characters_npc_toggle_trg after update of is_npc on public.characters
  for each row when (old.is_npc is distinct from new.is_npc) execute function public.npc_toggle_follows();



-- Online-Status: Der grüne Punkt kann durch ein eigenes Emoji (und optional einen kurzen Text) ersetzt werden.
-- Einstellbar im Redaktionsprofil; die Werte gehören zum eigenen Account (Policy profiles_update_own).
alter table public.profiles add column if not exists presence_emoji text;
alter table public.profiles add column if not exists presence_text text;
alter table public.profiles drop constraint if exists profiles_presence_emoji_len;
alter table public.profiles add constraint profiles_presence_emoji_len check (presence_emoji is null or char_length(presence_emoji) <= 16);
alter table public.profiles drop constraint if exists profiles_presence_text_len;
alter table public.profiles add constraint profiles_presence_text_len check (presence_text is null or char_length(presence_text) <= 40);


-- Wer hat meine Story gesehen? Pro Story und Charakter ein Eintrag. Sehen darf die Liste nur der Account, dem die Story gehört
-- (nicht die Welt-Besitzerin, nicht andere Mitglieder). Eintragen darf jede Person mit einem eigenen Charakter, nicht für die eigene Story.
create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, character_id)
);
create index if not exists story_views_character_idx on public.story_views (character_id);
alter table public.story_views enable row level security;

create policy "story_views_select_story_owner" on public.story_views
  for select to authenticated using (
    exists (
      select 1 from public.stories s join public.characters c on c.id = s.character_id
      where s.id = story_id and c.owner_id = auth.uid()
    )
  );
create policy "story_views_insert_own" on public.story_views
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    and not exists (
      select 1 from public.stories s join public.characters c on c.id = s.character_id
      where s.id = story_id and c.owner_id = auth.uid()
    )
  );


-- Eigene Zufallslisten pro Welt (Vornamen, Hobbys, Geheimnisse …): Der ChaBo-Generator mischt sie unter die mitgelieferten Listen.
-- Alle Mitglieder der Welt lesen und ergänzen; löschen dürfen die Person, die den Eintrag angelegt hat, und die Besitzerin der Welt.
create table if not exists public.world_random_entries (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  kind text not null check (kind in ('vorname', 'nachname', 'spitzname', 'hobby', 'beruf', 'eigenheit', 'lebensziel', 'geheimnis', 'angst')),
  text text not null check (char_length(text) between 1 and 200),
  created_by uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists world_random_entries_unique_idx on public.world_random_entries (world_id, kind, lower(text));
create index if not exists world_random_entries_world_idx on public.world_random_entries (world_id, kind);
alter table public.world_random_entries enable row level security;

create policy "world_random_entries_select_member" on public.world_random_entries
  for select to authenticated using (public.is_world_member(world_id));
create policy "world_random_entries_insert_member" on public.world_random_entries
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));
create policy "world_random_entries_delete_own_or_world_owner" on public.world_random_entries
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );


-- Eigene Badges von Account zu Account (Redaktion): Badge-Definitionen ohne Welt (world_id = null) gehören zum Account der Gestalterin.
-- Gestalten darf jede:r. Verleihen darf nur, wer das Badge gestaltet hat, und nur an Freund:innen. Sehen dürfen es alle Angemeldeten
-- (nur Name, Symbol, Farbe, Beschreibung); wer es bekommen hat, sieht man wie bei den anderen Abzeichen (eigene Sammlung bzw. Freund:innen).
alter table public.badge_defs alter column world_id drop not null;

alter policy "badge_defs_select_member" on public.badge_defs
  using (world_id is null or public.is_world_member(world_id));

alter policy "badge_defs_insert_member" on public.badge_defs
  with check (created_by = auth.uid() and (world_id is null or public.is_world_member(world_id)));

alter policy "badge_awards_insert" on public.badge_awards
  with check (
    (badge_key like 'auto:%' and character_id is not null and awarded_by is null and exists (
      select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()
    ))
    or (badge_key like 'account:%' and user_id = auth.uid() and awarded_by is null)
    or (badge_key like 'custom:%' and character_id is not null and def_id is not null and awarded_by = auth.uid() and exists (
      select 1
      from public.badge_defs d
      join public.characters c on c.world_id = d.world_id
      where d.id = def_id and c.id = character_id
        and (d.created_by = auth.uid() or exists (select 1 from public.worlds w where w.id = d.world_id and w.created_by = auth.uid()))
    ))
    or (badge_key = 'custom:' || def_id::text and user_id is not null and user_id <> auth.uid() and def_id is not null and awarded_by = auth.uid()
      and public.is_friend_of(user_id)
      and exists (select 1 from public.badge_defs d where d.id = def_id and d.world_id is null and d.created_by = auth.uid()))
  );

-- ===== Neues Kapitel = neue Szene (migration_scene_chapters.sql) =====
-- Neues Kapitel = neue Szene: Die Folgeszene verweist auf die vorherige, die vorherige wird abgeschlossen (und bekommt auf Wunsch eine Zusammenfassung).
alter table public.story_posts
  add column if not exists previous_story_id uuid references public.story_posts (id) on delete set null;

-- Höchstens eine Folgeszene je Szene
create unique index if not exists story_posts_previous_unique on public.story_posts (previous_story_id) where previous_story_id is not null;

-- Schließt die vorherige Szene ab. Erlaubt, wenn die Folgeszene von dir stammt und auf sie verweist und du in der alten Szene mitgespielt hast
-- (angelegt, Beitrag geschrieben) oder Welt-Besitzer:in bist.
create or replace function public.finish_scene_for_next(p_previous uuid, p_next uuid, p_recap text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_recap text := nullif(btrim(coalesce(p_recap, '')), '');
begin
  select world_id into v_world from public.story_posts where id = p_previous;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not exists (
    select 1 from public.story_posts n
    join public.characters c on c.id = n.character_id
    where n.id = p_next and n.previous_story_id = p_previous and n.world_id = v_world and c.owner_id = auth.uid()
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if not (
    exists (select 1 from public.story_posts p join public.characters c on c.id = p.character_id where p.id = p_previous and c.owner_id = auth.uid())
    or exists (select 1 from public.story_entries e join public.characters c on c.id = e.character_id where e.story_post_id = p_previous and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if v_recap is not null and char_length(v_recap) > 30000 then
    raise exception 'Die Zusammenfassung ist zu lang.';
  end if;
  update public.story_posts
    set locked = true,
        recap = coalesce(v_recap, recap),
        recap_by = case when v_recap is null then recap_by else auth.uid() end,
        recap_at = case when v_recap is null then recap_at else now() end
    where id = p_previous;
end;
$$;

revoke all on function public.finish_scene_for_next(uuid, uuid, text) from public, anon;
grant execute on function public.finish_scene_for_next(uuid, uuid, text) to authenticated;

-- ===== Folgeszene nachträglich ändern (migration_scene_chapter_link.sql) =====
-- Verknüpfung „Folgeszene“ nachträglich ändern: Die Datenbank sorgt dafür, dass die vorherige Szene aus derselben Welt stammt, nicht die Szene selbst ist und keine Kette im Kreis läuft.
create or replace function public.story_posts_check_previous()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cur uuid;
  depth int := 0;
  v_world uuid;
begin
  if new.previous_story_id is null then
    return new;
  end if;
  if new.previous_story_id = new.id then
    raise exception 'Eine Szene kann nicht auf sich selbst folgen';
  end if;
  select world_id into v_world from public.story_posts where id = new.previous_story_id;
  if v_world is distinct from new.world_id then
    raise exception 'Die vorherige Szene muss aus derselben Welt sein';
  end if;
  cur := new.previous_story_id;
  while cur is not null and depth < 1000 loop
    if cur = new.id then
      raise exception 'Die Szenen würden im Kreis laufen';
    end if;
    select previous_story_id into cur from public.story_posts where id = cur;
    depth := depth + 1;
  end loop;
  return new;
end;
$$;

drop trigger if exists story_posts_check_previous_trg on public.story_posts;
create trigger story_posts_check_previous_trg
  before insert or update of previous_story_id on public.story_posts
  for each row execute function public.story_posts_check_previous();

-- ===== Kapitel-Marken bearbeiten und datieren (migration_chapter_edit.sql) =====
-- Kapitel-Marken in einer Szene (story_entries.kind = 'chapter') lassen sich nachträglich bearbeiten und datieren.
-- Das Datum steht im Kalender der Welt und taucht auf Zeitleiste und Kalender auf.
alter table public.story_entries add column if not exists event_year integer;
alter table public.story_entries add column if not exists event_month smallint;
alter table public.story_entries add column if not exists event_day smallint;
alter table public.story_entries drop constraint if exists story_entries_event_ranges;
alter table public.story_entries add constraint story_entries_event_ranges check (
  (event_month is null or event_month between 1 and 99) and (event_day is null or event_day between 1 and 999)
);
create index if not exists story_entries_event_idx on public.story_entries (event_year) where event_year is not null;

-- Außer der Schreibenden dürfen auch die Autor:in der Szene und die Welt-Besitzer:in eine Kapitel-Marke ändern.
drop policy if exists "story_entries_update_chapter_staff" on public.story_entries;
create policy "story_entries_update_chapter_staff" on public.story_entries
  for update to authenticated using (
    kind = 'chapter' and (
      exists (select 1 from public.story_posts sp join public.characters c on c.id = sp.character_id where sp.id = story_post_id and c.owner_id = auth.uid())
      or exists (select 1 from public.story_posts sp join public.worlds w on w.id = sp.world_id where sp.id = story_post_id and w.created_by = auth.uid())
    )
  ) with check (
    kind = 'chapter' and (
      exists (select 1 from public.story_posts sp join public.characters c on c.id = sp.character_id where sp.id = story_post_id and c.owner_id = auth.uid())
      or exists (select 1 from public.story_posts sp join public.worlds w on w.id = sp.world_id where sp.id = story_post_id and w.created_by = auth.uid())
    )
  );

-- ===== Kapitel-Marke in eigene Szene umwandeln (migration_chapter_to_scene.sql) =====
-- Kapitel-Marke in einer Szene → eigene Szene („Neues Kapitel = neue Szene“ auch für ältere Kapitel).
-- Die neue Szene bekommt den Namen und das Datum des Kapitels und folgt auf die alte Szene. Der erste Beitrag nach der Marke wird ihr Eröffnungstext,
-- alle weiteren Beiträge ziehen mit um. Die alte Szene wird abgeschlossen (Zusammenfassung = die des Kapitels, falls sie noch keine hat);
-- der Zug (wer ist dran) geht an die neue Szene. Hängt schon eine Folgeszene an der alten, folgt sie danach der neuen.
create or replace function public.chapter_to_scene(p_entry uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.story_entries%rowtype;
  s public.story_posts%rowtype;
  o public.story_entries%rowtype;
  v_new uuid;
  v_next uuid;
  v_recap text;
begin
  select * into m from public.story_entries where id = p_entry and kind = 'chapter';
  if not found then
    raise exception 'Kapitel nicht gefunden';
  end if;
  select * into s from public.story_posts where id = m.story_post_id;
  if not (
    exists (select 1 from public.characters c where c.id = s.character_id and c.owner_id = auth.uid())
    or exists (select 1 from public.characters c where c.id = m.character_id and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = s.world_id and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;

  select * into o from public.story_entries
    where story_post_id = s.id and created_at > m.created_at and kind in ('entry', 'narrator') and roll_label is null
    order by created_at limit 1;

  select id into v_next from public.story_posts where previous_story_id = s.id;
  if v_next is not null then
    update public.story_posts set previous_story_id = null where id = v_next;
  end if;

  insert into public.story_posts (world_id, character_id, arc_id, title, content, tags, is_private, locked, narrator, location,
                                  event_year, event_month, event_day, previous_story_id, turn_character_id, turn_set_at, created_at)
  values (s.world_id, coalesce(o.character_id, m.character_id), s.arc_id, coalesce(nullif(btrim(m.chapter_title), ''), m.content),
          coalesce(o.content, ''), '{}', s.is_private, false, coalesce(o.kind = 'narrator', false), s.location,
          m.event_year, m.event_month, m.event_day, s.id, s.turn_character_id, s.turn_set_at, coalesce(o.created_at, m.created_at))
  returning id into v_new;

  if s.is_private then
    insert into public.story_post_viewers (story_post_id, character_id)
      select v_new, v.character_id from public.story_post_viewers v where v.story_post_id = s.id
      on conflict do nothing;
  end if;

  update public.story_entries set story_post_id = v_new
    where story_post_id = s.id and created_at > m.created_at and (o.id is null or id <> o.id);
  delete from public.story_entries where id = m.id or id = o.id;

  if v_next is not null then
    update public.story_posts set previous_story_id = v_new where id = v_next;
  end if;

  v_recap := nullif(btrim(coalesce(m.chapter_summary, '')), '');
  update public.story_posts
    set locked = true, turn_character_id = null, turn_set_at = null, ai_summary = null, ai_summary_count = null,
        recap = coalesce(recap, case when v_recap is null then null
                                     else '<p>' || replace(replace(replace(v_recap, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>' end),
        recap_by = case when recap is null and v_recap is not null then auth.uid() else recap_by end,
        recap_at = case when recap is null and v_recap is not null then now() else recap_at end
    where id = s.id;

  return v_new;
end;
$$;

revoke all on function public.chapter_to_scene(uuid) from public, anon;
grant execute on function public.chapter_to_scene(uuid) to authenticated;

-- ===== Ereignis aus einer Story-Nachricht (migration_event_from_entry.sql) =====
-- Aus einer Nachricht in der Story ein Ereignis machen: Die Wiki-Seite (Art „Ereignis“) merkt sich Nachricht und Szene,
-- damit die Zeitleiste/der Kalender zur Nachricht zurückführen und die Nachricht als „markiert“ erscheint.
alter table public.wiki_pages add column if not exists source_entry_id uuid references public.story_entries (id) on delete set null;
alter table public.wiki_pages add column if not exists source_story_id uuid references public.story_posts (id) on delete set null;
create index if not exists wiki_pages_source_entry_idx on public.wiki_pages (source_entry_id) where source_entry_id is not null;
create index if not exists wiki_pages_source_story_idx on public.wiki_pages (source_story_id) where source_story_id is not null;

-- ===== Welt-Admins (migration_world_admins.sql) =====
-- Welt-Admins: Die Besitzer:in kann Mitglieder zu Admins ernennen. Admins dürfen die Welt bearbeiten (Name, Bild, Beschreibung), Freund:innen einladen,
-- normale Mitglieder entfernen und Szenen moderieren (anpinnen, abschließen, archivieren). Löschen der Welt, Admins ernennen/entziehen und
-- das Entfernen anderer Admins bleibt bei der Besitzer:in.
alter table public.world_members add column if not exists role text not null default 'member';
alter table public.world_members add constraint world_members_role_check check (role in ('member', 'admin'));

create or replace function public.is_world_admin(_world_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.worlds w where w.id = _world_id and w.created_by = auth.uid())
      or exists (select 1 from public.world_members wm where wm.world_id = _world_id and wm.user_id = auth.uid() and wm.role = 'admin');
$$;

revoke all on function public.is_world_admin(uuid) from public, anon;
grant execute on function public.is_world_admin(uuid) to authenticated;

-- Die Besitzer:in einer Welt darf nicht wechseln (sonst könnte eine Admin sich zur Besitzer:in machen)
create or replace function public.worlds_keep_owner()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Die Besitzer:in einer Welt lässt sich nicht ändern';
  end if;
  return new;
end;
$$;

create trigger worlds_keep_owner_trg before update on public.worlds for each row execute function public.worlds_keep_owner();

alter policy "worlds_update_own" on public.worlds using (public.is_world_admin(id));

alter policy "world_members_insert" on public.world_members with check (
  role = 'member' and (
  user_id = auth.uid()
  or (public.is_world_admin(world_id) and public.is_friend_of(user_id))
  )
);

alter policy "world_members_delete_own" on public.world_members using (
  user_id = auth.uid()
  or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  or (
    public.is_world_admin(world_id)
    and role = 'member'
    and not exists (select 1 from public.worlds w where w.id = world_id and w.created_by = world_members.user_id)
  )
);

-- Nur die Besitzer:in ändert Rollen (Mitglied ↔ Admin); niemand ändert die eigene Rolle über andere Wege
create policy "world_members_update_role" on public.world_members
  for update to authenticated
  using (exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid()))
  with check (exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid()));

alter policy "story_posts_update_world_owner" on public.story_posts using (public.is_world_admin(world_id));

-- ===== Bezeichnung von Kapitel-Marken (migration_chapter_label.sql) =====
-- Kapitel-Marken bekommen eine frei wählbare Bezeichnung statt „Kapitel N“ (z. B. „Teil 2“, „Akt III“, „Nachspiel“); leer = „Kapitel N“.
alter table public.story_entries add column if not exists chapter_label text;
alter table public.story_entries drop constraint if exists story_entries_chapter_label_len;
alter table public.story_entries add constraint story_entries_chapter_label_len check (chapter_label is null or char_length(chapter_label) <= 40);

notify pgrst, 'reload schema';
