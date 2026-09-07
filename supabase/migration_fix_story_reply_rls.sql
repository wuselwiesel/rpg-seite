-- Kritischer Bugfix: story_entries_insert_member erlaubte bisher nur der
-- Post-Autorin/dem Post-Autor selbst, eine Fortsetzung zu schreiben - jede
-- andere Person bekam eine RLS-Ablehnung ("new row violates row-level
-- security policy"). Ursache: "character_id" war unqualifiziert, und
-- story_posts hat selbst eine character_id-Spalte (die Autor:in). Postgres
-- löste den Bezug auf die NÄHERE Spalte im JOIN (sp.character_id) auf statt
-- auf die neue story_entries-Zeile - ein reiner SQL-Scoping-Fehler, der seit
-- Einführung der Story-Funktion bestand, aber erst beim Testen von zwei
-- unterschiedlichen Nutzer:innen im selben Thread auffiel.

drop policy "story_entries_insert_member" on public.story_entries;
create policy "story_entries_insert_member" on public.story_entries
  for insert to authenticated with check (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = story_entries.character_id
      where sp.id = story_entries.story_post_id
        and c.owner_id = auth.uid()
        and c.world_id = sp.world_id
        and not sp.locked
        and (not sp.is_private or public.can_view_private_story_post(sp.id, sp.character_id))
    )
  );

-- Kleinere Ergänzung: eine als Viewer gelistete Person konnte ihren eigenen
-- Eintrag in story_post_viewers bisher nicht lesen (nur die Autorin/der
-- Autor der Szene durfte die Liste sehen).
create policy "story_post_viewers_select_own_viewer" on public.story_post_viewers
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );
