-- Kapitel-Marken in einer Szene (story_entries.kind = 'chapter') lassen sich nachträglich bearbeiten und datieren.
-- Das Datum steht im Kalender der Welt und taucht auf Zeitleiste und Kalender auf.
alter table public.story_entries add column if not exists event_year integer;
alter table public.story_entries add column if not exists event_month smallint;
alter table public.story_entries add column if not exists event_day smallint;
alter table public.story_entries drop constraint if exists story_entries_event_ranges;
alter table public.story_entries add constraint story_entries_event_ranges check (
  (event_month is null or event_month between 1 and 99) and (event_day is null or event_day between 1 and 999)
);
create index if not exists story_entries_event_idx on public.story_entries (event_year) where event_year is not null;

-- Außer der Schreibenden dürfen auch die Autor:in der Szene und die Welt-Besitzer:in eine Kapitel-Marke ändern.
drop policy if exists "story_entries_update_chapter_staff" on public.story_entries;
create policy "story_entries_update_chapter_staff" on public.story_entries
  for update to authenticated using (
    kind = 'chapter' and (
      exists (select 1 from public.story_posts sp join public.characters c on c.id = sp.character_id where sp.id = story_post_id and c.owner_id = auth.uid())
      or exists (select 1 from public.story_posts sp join public.worlds w on w.id = sp.world_id where sp.id = story_post_id and w.created_by = auth.uid())
    )
  ) with check (
    kind = 'chapter' and (
      exists (select 1 from public.story_posts sp join public.characters c on c.id = sp.character_id where sp.id = story_post_id and c.owner_id = auth.uid())
      or exists (select 1 from public.story_posts sp join public.worlds w on w.id = sp.world_id where sp.id = story_post_id and w.created_by = auth.uid())
    )
  );

notify pgrst, 'reload schema';
