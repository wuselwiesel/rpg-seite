-- Migration: mehrere Fotos, angepinnte/geplante Beiträge, Story-Verknüpfung,
-- Kommentar-Antworten, Chat-Antworten/geteilte Beiträge/Story-Antworten, Gelesen-Haken, Story-Likes
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

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
