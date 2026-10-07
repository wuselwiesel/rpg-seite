-- Migration: „Mit dabei“ – Charaktere, die beim Anlegen einer Szene als sicher beteiligt verlinkt werden.
-- Sehen darf die Liste, wer die Szene sehen darf; eintragen und ändern darf die Autor:in der Szene.
create table if not exists public.story_post_cast (
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_post_id, character_id)
);

alter table public.story_post_cast enable row level security;

drop policy if exists "story_post_cast_select" on public.story_post_cast;
create policy "story_post_cast_select" on public.story_post_cast
  for select to authenticated using (
    exists (select 1 from public.story_posts sp where sp.id = story_post_id)
  );

drop policy if exists "story_post_cast_insert_author" on public.story_post_cast;
create policy "story_post_cast_insert_author" on public.story_post_cast
  for insert to authenticated with check (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = sp.character_id
      where sp.id = story_post_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "story_post_cast_delete_author" on public.story_post_cast;
create policy "story_post_cast_delete_author" on public.story_post_cast
  for delete to authenticated using (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = sp.character_id
      where sp.id = story_post_id and c.owner_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
