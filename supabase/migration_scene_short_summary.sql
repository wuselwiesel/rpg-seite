-- Kurzbeschreibung einer Szene (höchstens 300 Zeichen): erscheint kompakt auf der Zeitleiste, damit man sofort sieht, worum es geht.
alter table public.story_posts add column if not exists short_summary text;
alter table public.story_posts drop constraint if exists story_posts_short_summary_len;
alter table public.story_posts add constraint story_posts_short_summary_len check (short_summary is null or char_length(short_summary) <= 300);

notify pgrst, 'reload schema';
