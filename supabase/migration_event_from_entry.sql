-- Aus einer Nachricht in der Story ein Ereignis machen: Die Wiki-Seite (Art „Ereignis“) merkt sich Nachricht und Szene,
-- damit die Zeitleiste/der Kalender zur Nachricht zurückführen und die Nachricht als „markiert“ erscheint.
alter table public.wiki_pages add column if not exists source_entry_id uuid references public.story_entries (id) on delete set null;
alter table public.wiki_pages add column if not exists source_story_id uuid references public.story_posts (id) on delete set null;
create index if not exists wiki_pages_source_entry_idx on public.wiki_pages (source_entry_id) where source_entry_id is not null;
create index if not exists wiki_pages_source_story_idx on public.wiki_pages (source_story_id) where source_story_id is not null;

notify pgrst, 'reload schema';
