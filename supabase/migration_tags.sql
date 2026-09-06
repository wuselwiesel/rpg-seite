-- Migration: Hashtags für Feed-Beiträge und Story-Szenen
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

alter table public.posts add column if not exists tags text[] not null default '{}';
alter table public.story_posts add column if not exists tags text[] not null default '{}';

create index if not exists posts_tags_idx on public.posts using gin (tags);
create index if not exists story_posts_tags_idx on public.story_posts using gin (tags);
