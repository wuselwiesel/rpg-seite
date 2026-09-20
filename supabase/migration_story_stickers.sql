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

-- Storys nur mit Stickern (ohne Bild/Text) sind erlaubt.
alter table public.stories drop constraint if exists stories_has_content;
alter table public.stories add constraint stories_has_content
  check (image_url is not null or video_url is not null or coalesce(text_content, '') <> '' or overlays is not null or stickers is not null);
