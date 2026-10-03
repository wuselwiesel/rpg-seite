-- Szenen bekommen einen Zeitpunkt im Kalender der Welt (wie Wiki-Seiten), damit sie gemeinsam mit der Weltgeschichte auf der Zeitleiste stehen.
-- Teilweise Daten sind möglich (nur Jahr; Jahr und Monat) und ein Zeitraum (Ende). Das Freitextfeld in_world_time bleibt als Zusatz („Abenddämmerung“).
alter table public.story_posts add column if not exists event_year integer;
alter table public.story_posts add column if not exists event_month smallint;
alter table public.story_posts add column if not exists event_day smallint;
alter table public.story_posts add column if not exists event_end_year integer;
alter table public.story_posts add column if not exists event_end_month smallint;
alter table public.story_posts add column if not exists event_end_day smallint;
alter table public.story_posts drop constraint if exists story_posts_event_ranges;
alter table public.story_posts add constraint story_posts_event_ranges check (
  (event_month is null or event_month between 1 and 99) and (event_day is null or event_day between 1 and 999)
  and (event_end_month is null or event_end_month between 1 and 99) and (event_end_day is null or event_end_day between 1 and 999)
);
create index if not exists story_posts_event_idx on public.story_posts (world_id, event_year) where event_year is not null;
