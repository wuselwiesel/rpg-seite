-- Wiki Runde 8: Zeitpunkt an Wiki-Seiten (z. B. Ereignisse) und ein frei einstellbarer Kalender je Welt.
-- Daten sind teilweise möglich (nur Jahr; Jahr und Monat; ganzes Datum) und können einen Zeitraum (Ende) haben.
alter table public.wiki_pages add column if not exists event_year integer;
alter table public.wiki_pages add column if not exists event_month smallint;
alter table public.wiki_pages add column if not exists event_day smallint;
alter table public.wiki_pages add column if not exists event_end_year integer;
alter table public.wiki_pages add column if not exists event_end_month smallint;
alter table public.wiki_pages add column if not exists event_end_day smallint;
alter table public.wiki_pages add constraint wiki_pages_event_ranges check (
  (event_month is null or event_month between 1 and 99) and (event_day is null or event_day between 1 and 999)
  and (event_end_month is null or event_end_month between 1 and 99) and (event_end_day is null or event_end_day between 1 and 999)
);
create index if not exists wiki_pages_event_idx on public.wiki_pages (world_id, event_year) where event_year is not null;

-- Kalender der Welt: Liste der Monate (Name, Anzahl Tage) und eine Bezeichnung für die Jahreszählung (z. B. „n. d. Zeitenwende“).
create table if not exists public.wiki_calendars (
  world_id uuid primary key references public.worlds (id) on delete cascade,
  months jsonb not null,
  era text check (era is null or char_length(era) <= 40),
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.wiki_calendars enable row level security;
drop policy if exists "wiki_calendars_select_member" on public.wiki_calendars;
create policy "wiki_calendars_select_member" on public.wiki_calendars for select using (is_world_member(world_id));
drop policy if exists "wiki_calendars_insert_member" on public.wiki_calendars;
create policy "wiki_calendars_insert_member" on public.wiki_calendars for insert with check (is_world_member(world_id) and updated_by = auth.uid());
drop policy if exists "wiki_calendars_update_member" on public.wiki_calendars;
create policy "wiki_calendars_update_member" on public.wiki_calendars for update using (is_world_member(world_id)) with check (is_world_member(world_id));
grant select, insert, update on public.wiki_calendars to authenticated;

notify pgrst, 'reload schema';
