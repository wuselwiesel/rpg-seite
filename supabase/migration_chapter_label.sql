-- Kapitel-Marken bekommen eine frei wählbare Bezeichnung statt „Kapitel N“ (z. B. „Teil 2“, „Akt III“, „Nachspiel“); leer = „Kapitel N“.
alter table public.story_entries add column if not exists chapter_label text;
alter table public.story_entries drop constraint if exists story_entries_chapter_label_len;
alter table public.story_entries add constraint story_entries_chapter_label_len check (chapter_label is null or char_length(chapter_label) <= 40);

notify pgrst, 'reload schema';
