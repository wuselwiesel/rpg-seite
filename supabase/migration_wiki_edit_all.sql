-- Wiki: Jedes Mitglied der Welt darf jeden Eintrag bearbeiten (nicht nur Ersteller:in und Welt-Besitzer:in).
-- Löschen bleibt bei Ersteller:in und Welt-Besitzer:in.
drop policy if exists "wiki_pages_update_own_or_world_owner" on public.wiki_pages;
drop policy if exists "wiki_pages_update_member" on public.wiki_pages;
create policy "wiki_pages_update_member" on public.wiki_pages
  for update to authenticated
  using (public.is_world_member(world_id))
  with check (public.is_world_member(world_id));

notify pgrst, 'reload schema';
