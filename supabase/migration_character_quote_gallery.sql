-- Zitat des Charakters (kurze Zeile im Profil) und Bildergalerie je Charakter
alter table public.characters add column if not exists quote text;
alter table public.characters drop constraint if exists characters_quote_len;
alter table public.characters add constraint characters_quote_len check (quote is null or char_length(quote) <= 200);

create table if not exists public.character_gallery (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  image_url text not null,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint character_gallery_caption_len check (caption is null or char_length(caption) <= 140)
);
create index if not exists character_gallery_character_idx on public.character_gallery (character_id, position);
alter table public.character_gallery enable row level security;

drop policy if exists "character_gallery_select_member" on public.character_gallery;
create policy "character_gallery_select_member" on public.character_gallery
  for select to authenticated using (public.is_world_member_character(character_id));

drop policy if exists "character_gallery_write_owner" on public.character_gallery;
create policy "character_gallery_write_owner" on public.character_gallery
  for all to authenticated
  using (exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()));
