-- NPC-Kommentare sollen nicht nur auf eigenen Beiträgen möglich sein, sondern überall dort, wo man
-- auch "echt" (mit einem Charakter) kommentieren könnte - also auch auf Beiträgen von Freund:innen.
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
        where p.id = post_id and (pc.owner_id = auth.uid() or public.is_friend_of(pc.owner_id))
      )
    )
  );

notify pgrst, 'reload schema';
