-- Erlaubt es, Push-Benachrichtigungen pro Typ (Gefällt mir, Kommentare, Erwähnungen,
-- Chat-Nachrichten, "Du bist dran", Würfe, Freundschaftsanfragen) einzeln auszuschalten -
-- analog zu den bereits vorhandenen muted_world_ids/muted_character_ids.
alter table public.notification_prefs
  add column if not exists muted_notification_types text[] not null default '{}';
