-- Textbasiertes RPG - Datenbankschema
-- Im Supabase SQL Editor des eigenen Projekts ausführen (einmalig).

-- ---------------------------------------------------------------------------
-- Profiles (1 Zeile pro Auth-User, wird automatisch per Trigger angelegt)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

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
-- Characters
-- ---------------------------------------------------------------------------
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "characters_select_all" on public.characters
  for select to authenticated using (true);

create policy "characters_insert_own" on public.characters
  for insert to authenticated with check (owner_id = auth.uid());

create policy "characters_update_own" on public.characters
  for update to authenticated using (owner_id = auth.uid());

create policy "characters_delete_own" on public.characters
  for delete to authenticated using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Posts (Story-Einträge im Feed) & Comments
-- ---------------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts_select_all" on public.posts
  for select to authenticated using (true);

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

create policy "comments_select_all" on public.comments
  for select to authenticated using (true);

create policy "comments_insert_own_character" on public.comments
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

create policy "comments_delete_own" on public.comments
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
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
