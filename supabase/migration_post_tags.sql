-- Migration: Charaktere in Beiträgen markieren (wie bei Instagram)

create table if not exists public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  primary key (post_id, character_id)
);

create index if not exists post_tags_character_idx on public.post_tags (character_id);

alter table public.post_tags enable row level security;

drop policy if exists "post_tags_select" on public.post_tags;
create policy "post_tags_select" on public.post_tags
  for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists "post_tags_insert_author" on public.post_tags;
create policy "post_tags_insert_author" on public.post_tags
  for insert to authenticated with check (
    exists (
      select 1 from public.posts p
      join public.characters c on c.id = p.character_id
      where p.id = post_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "post_tags_delete_author" on public.post_tags;
create policy "post_tags_delete_author" on public.post_tags
  for delete to authenticated using (
    exists (
      select 1 from public.posts p
      join public.characters c on c.id = p.character_id
      where p.id = post_id and c.owner_id = auth.uid()
    )
  );
