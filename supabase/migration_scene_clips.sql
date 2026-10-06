-- Migration: Wichtige Momente (Ausschnitte aus Szenen) und Zitate im Szenen-Chat
-- * scene_clips: ein gespeicherter Ausschnitt (eine oder mehrere Story-Nachrichten einer Szene) mit Titel und Notiz.
--   Der Wortlaut wird beim Speichern als Kopie (items) mitgespeichert und bleibt lesbar, auch wenn das Original
--   später geändert oder gelöscht wird. Er gehört der Spieler:in (privat).
-- * clip_collections: frei benannte Sammlungen pro Charakter (z. B. „Erinnerungen“, „Unfälle“); sie erscheinen im ChaBo.
-- * clip_collection_items: welcher Ausschnitt in welcher Sammlung steht (ein Ausschnitt kann in mehreren stehen).
-- * account_messages.quote: Zitat aus der Szene (Nachrichten oder Ausschnitt) in einer Chat-Nachricht des Szenen-Chats.

create table if not exists public.scene_clips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  story_post_id uuid references public.story_posts (id) on delete set null,
  scene_title text not null default '',
  title text not null check (char_length(title) between 1 and 120),
  note text check (note is null or char_length(note) <= 1000),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scene_clips_owner_idx on public.scene_clips (owner_id, created_at desc);

create table if not exists public.clip_collections (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists clip_collections_name_uidx on public.clip_collections (character_id, lower(name));

create table if not exists public.clip_collection_items (
  collection_id uuid not null references public.clip_collections (id) on delete cascade,
  clip_id uuid not null references public.scene_clips (id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (collection_id, clip_id)
);

alter table public.scene_clips enable row level security;
alter table public.clip_collections enable row level security;
alter table public.clip_collection_items enable row level security;

-- Hilfsfunktion: gehört der Charakter dem aufrufenden Konto? (ohne Rekursion über die RLS von characters)
create or replace function public.owns_character(p_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.characters c where c.id = p_character_id and c.owner_id = auth.uid());
$$;

revoke all on function public.owns_character(uuid) from public, anon;
grant execute on function public.owns_character(uuid) to authenticated;

drop policy if exists "scene_clips_own" on public.scene_clips;
create policy "scene_clips_own" on public.scene_clips
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "clip_collections_own" on public.clip_collections;
create policy "clip_collections_own" on public.clip_collections
  for all to authenticated using (public.owns_character(character_id)) with check (public.owns_character(character_id));

drop policy if exists "clip_collection_items_own" on public.clip_collection_items;
create policy "clip_collection_items_own" on public.clip_collection_items
  for all to authenticated
  using (exists (select 1 from public.scene_clips s where s.id = clip_id and s.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.scene_clips s where s.id = clip_id and s.owner_id = auth.uid())
    and exists (select 1 from public.clip_collections k where k.id = collection_id and public.owns_character(k.character_id))
  );

alter table public.account_messages add column if not exists quote jsonb;

notify pgrst, 'reload schema';
