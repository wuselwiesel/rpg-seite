-- Wiki-Inhaltsverzeichnis: Standard für die ganze Welt (worlds.wiki_toc_default) und je Wiki-Art (wiki_types.toc).
-- Es gilt die erste vorhandene Einstellung: Seite (wiki_pages.toc), dann Art, dann Welt; sonst das fest eingebaute Verhalten.
-- Die Einstellung der Seite darf größer werden (eigene Namen, Reihenfolge, eigene Einträge): Grenze von 8000 auf 16000 Byte.
alter table public.wiki_types add column if not exists toc jsonb;
alter table public.wiki_types drop constraint if exists wiki_types_toc_size;
alter table public.wiki_types add constraint wiki_types_toc_size check (toc is null or pg_column_size(toc) <= 16000);

alter table public.worlds add column if not exists wiki_toc_default jsonb;
alter table public.worlds drop constraint if exists worlds_wiki_toc_default_size;
alter table public.worlds add constraint worlds_wiki_toc_default_size check (wiki_toc_default is null or pg_column_size(wiki_toc_default) <= 16000);

alter table public.wiki_pages drop constraint if exists wiki_pages_toc_size;
alter table public.wiki_pages add constraint wiki_pages_toc_size check (toc is null or pg_column_size(toc) <= 16000);

notify pgrst, 'reload schema';
