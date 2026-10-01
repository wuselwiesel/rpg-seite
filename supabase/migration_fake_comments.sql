-- Erlaubt der Besitzerin/dem Besitzer eines Beitrags, Kommentare von frei erfundenen "Profilen"
-- (nur Name + Avatar, nicht an einen echten Charakter gebunden) zu posten - z.B. damit ein Beitrag
-- aussieht, als wären mehrere Personen beteiligt. Nur für eigene Beiträge möglich; für alle anderen
-- Betrachter:innen sind diese Kommentare nicht von echten zu unterscheiden.
alter table public.comments
  alter column character_id drop not null,
  add column fake_author_id uuid references public.profiles (id) on delete cascade,
  add column fake_name text,
  add column fake_avatar_url text;

alter table public.comments
  add constraint comments_author_check check (
    (character_id is not null and fake_author_id is null and fake_name is null)
    or
    (character_id is null and fake_author_id is not null and fake_name is not null)
  );

create index comments_fake_author_idx on public.comments (fake_author_id);

drop policy "comments_insert_own_character" on public.comments;
create policy "comments_insert_own_character" on public.comments
  for insert to authenticated with check (
    (
      character_id is not null
      and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
      and exists (
        select 1 from public.posts p
        join public.characters pc on pc.id = p.character_id
        where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
      )
    )
    or
    (
      character_id is null
      and fake_author_id = auth.uid()
      and exists (
        select 1 from public.posts p
        join public.characters pc on pc.id = p.character_id
        where p.id = post_id and pc.owner_id = auth.uid()
      )
    )
  );

drop policy "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete to authenticated using (
    (character_id is not null and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
    or fake_author_id = auth.uid()
  );

drop policy "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update to authenticated using (
    (character_id is not null and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
    or fake_author_id = auth.uid()
  ) with check (
    (character_id is not null and exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()))
    or fake_author_id = auth.uid()
  );

notify pgrst, 'reload schema';
