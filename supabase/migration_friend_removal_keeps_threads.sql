-- Migration: Freundschaft beenden verliert keine Gespräche mehr
-- Beiträge von Charakteren der eigenen Welten sind für Weltmitglieder schon sichtbar (posts_select_world_member).
-- Ihre Kommentare und Reaktionen waren es nur für Freund:innen: Wer jemanden als Freund:in entfernte, sah danach
-- zwar den Beitrag, aber nicht mehr die Unterhaltung darunter (auch die eigenen Kommentare nicht).
-- Jetzt gilt für Kommentare und Reaktionen dieselbe Sichtbarkeit wie für den Beitrag.

drop policy if exists "comments_select_world_member" on public.comments;
create policy "comments_select_world_member" on public.comments
  for select to authenticated using (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id and public.is_world_member_character(p.character_id)
    )
  );

alter policy "reactions_select_post_visible" on public.reactions using (
  (post_id is not null) and exists (
    select 1
    from public.posts p
    join public.characters pc on pc.id = p.character_id
    where p.id = reactions.post_id
      and (
        pc.owner_id = auth.uid()
        or public.is_friend_of(pc.owner_id)
        or public.is_followed_world_character(pc.id)
        or public.is_world_member(pc.world_id)
      )
  )
);

notify pgrst, 'reload schema';
