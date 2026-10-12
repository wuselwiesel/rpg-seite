-- Welten, aus denen es nur die tägliche Zusammenfassung gibt (kein sofortiger Push)
alter table public.notification_prefs add column if not exists digest_world_ids uuid[] not null default '{}';

notify pgrst, 'reload schema';
