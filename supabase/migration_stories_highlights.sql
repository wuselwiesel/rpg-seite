-- Migration: Storys (zeitlich begrenzt) und Highlights
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

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
