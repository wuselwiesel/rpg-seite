-- Migration: Welten löschen können (nur die Erstellerin/der Ersteller)
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

drop policy if exists "worlds_delete_own" on public.worlds;
create policy "worlds_delete_own" on public.worlds
  for delete to authenticated using (created_by = auth.uid());
