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
