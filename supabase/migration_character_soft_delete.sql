-- Migration: Charaktere werden nicht mehr wirklich gelöscht
-- Das Löschen eines Charakters hat bisher per ON DELETE CASCADE seine Chat-Nachrichten, Story-Einträge, Szenen,
-- Beiträge, Kommentare, Stories, Beziehungen, ChaBo und mehr mitgelöscht. Jetzt setzt „Löschen“ nur noch `deleted_at`:
-- Der Charakter taucht in keiner Auswahl mehr auf, alles, was er geschrieben hat, bleibt unverändert sichtbar.
-- Wiederherstellen = `deleted_at` wieder auf null.

alter table public.characters add column if not exists deleted_at timestamptz;

create index if not exists characters_active_idx on public.characters (world_id) where deleted_at is null;

notify pgrst, 'reload schema';
