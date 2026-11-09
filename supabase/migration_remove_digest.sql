-- Tägliche Zusammenfassung entfernt (9. November 2026): Funktion und Spalten werden nicht mehr gebraucht.
-- Erst ausführen, nachdem der Code ohne die Zusammenfassung ausgeliefert ist (sonst schlägt ein alter Cron-Aufruf fehl).
drop function if exists public.digest_due(text);

alter table public.notification_prefs
  drop column if exists digest_enabled,
  drop column if exists digest_only,
  drop column if exists digest_last_sent_at,
  drop column if exists digest_world_ids;
