-- Persönliches: Faceclaims und Notizbuch. Alles gehört der schreibenden Person und ist für niemanden sonst lesbar.

-- Faceclaim je Charakter (und je Person): bewusst nicht in characters, denn diese Tabelle ist für die ganze Welt lesbar.
create table if not exists public.character_private (
  character_id uuid not null references public.characters (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  faceclaim text check (faceclaim is null or char_length(faceclaim) <= 120),
  faceclaim_link text check (faceclaim_link is null or char_length(faceclaim_link) <= 500),
  faceclaim_images text[] not null default '{}' check (cardinality(faceclaim_images) <= 8),
  updated_at timestamptz not null default now(),
  primary key (character_id, owner_id)
);
create index if not exists character_private_owner_idx on public.character_private (owner_id);

alter table public.character_private enable row level security;
drop policy if exists character_private_own on public.character_private;
create policy character_private_own on public.character_private
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.characters c where c.id = character_id));
revoke all on public.character_private from anon;
grant select, insert, update, delete on public.character_private to authenticated;

-- Notizbuch
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  world_id uuid references public.worlds (id) on delete set null,
  title text not null default '' check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 100000),
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);
create index if not exists notes_world_idx on public.notes (world_id) where world_id is not null;

-- Verknüpfungen einer Notiz: genau ein Ziel je Zeile (mit Fremdschlüssel, damit gelöschte Ziele die Verknüpfung mitnehmen)
create table if not exists public.note_links (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  character_id uuid references public.characters (id) on delete cascade,
  wiki_page_id uuid references public.wiki_pages (id) on delete cascade,
  story_post_id uuid references public.story_posts (id) on delete cascade,
  clip_id uuid references public.scene_clips (id) on delete cascade,
  linked_note_id uuid references public.notes (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint note_links_one_target check (num_nonnulls(character_id, wiki_page_id, story_post_id, clip_id, linked_note_id) = 1),
  constraint note_links_not_self check (linked_note_id is distinct from note_id)
);
create unique index if not exists note_links_character_uidx on public.note_links (note_id, character_id) where character_id is not null;
create unique index if not exists note_links_wiki_uidx on public.note_links (note_id, wiki_page_id) where wiki_page_id is not null;
create unique index if not exists note_links_story_uidx on public.note_links (note_id, story_post_id) where story_post_id is not null;
create unique index if not exists note_links_clip_uidx on public.note_links (note_id, clip_id) where clip_id is not null;
create unique index if not exists note_links_note_uidx on public.note_links (note_id, linked_note_id) where linked_note_id is not null;
create index if not exists note_links_user_idx on public.note_links (user_id);
create index if not exists note_links_character_idx on public.note_links (character_id) where character_id is not null;
create index if not exists note_links_wiki_idx on public.note_links (wiki_page_id) where wiki_page_id is not null;
create index if not exists note_links_story_idx on public.note_links (story_post_id) where story_post_id is not null;
create index if not exists note_links_clip_idx on public.note_links (clip_id) where clip_id is not null;
create index if not exists note_links_linked_note_idx on public.note_links (linked_note_id) where linked_note_id is not null;

alter table public.notes enable row level security;
alter table public.note_links enable row level security;

drop policy if exists notes_own on public.notes;
create policy notes_own on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists note_links_own on public.note_links;
create policy note_links_own on public.note_links
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notes n where n.id = note_id and n.user_id = (select auth.uid()))
  );

revoke all on public.notes, public.note_links from anon;
grant select, insert, update, delete on public.notes, public.note_links to authenticated;

notify pgrst, 'reload schema';
