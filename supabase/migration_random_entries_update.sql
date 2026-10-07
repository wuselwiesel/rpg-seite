-- Migration: Eigene Zufallslisten-Einträge bearbeiten.
-- Ändern dürfen die Person, die den Eintrag angelegt hat, und die Besitzerin der Welt (wie beim Löschen).
drop policy if exists "world_random_entries_update_own_or_world_owner" on public.world_random_entries;
create policy "world_random_entries_update_own_or_world_owner" on public.world_random_entries
  for update to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  )
  with check (
    char_length(text) between 1 and 200
    and (
      created_by = auth.uid()
      or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
    )
  );

notify pgrst, 'reload schema';
