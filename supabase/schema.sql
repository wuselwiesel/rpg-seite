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
  roll_value integer,
  roll_die integer,
  roll_result integer,
  roll_success boolean,
  roll_target_character_id uuid references public.characters (id) on delete set null
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
