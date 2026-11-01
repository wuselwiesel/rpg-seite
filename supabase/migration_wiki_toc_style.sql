-- Wiki: eigenes Inhaltsverzeichnis je Seite (wiki_pages.toc) und Wiki-Design je Welt (worlds.wiki_style).
-- Beide Spalten sind leer, solange nichts eingestellt ist; die Seiten sehen dann aus wie bisher.
alter table public.wiki_pages add column if not exists toc jsonb;
alter table public.wiki_pages drop constraint if exists wiki_pages_toc_size;
alter table public.wiki_pages add constraint wiki_pages_toc_size check (toc is null or pg_column_size(toc) <= 8000);

alter table public.worlds add column if not exists wiki_style jsonb;
alter table public.worlds drop constraint if exists worlds_wiki_style_size;
alter table public.worlds add constraint worlds_wiki_style_size check (wiki_style is null or pg_column_size(wiki_style) <= 4000);
