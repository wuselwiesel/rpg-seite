-- Wiki-Startseite der Welt (Baukasten aus Bausteinen), von Besitzer:in/Admins gepflegt; null = keine eigene Startseite
alter table public.worlds add column if not exists wiki_home jsonb;
alter table public.worlds drop constraint if exists worlds_wiki_home_size;
alter table public.worlds add constraint worlds_wiki_home_size check (wiki_home is null or pg_column_size(wiki_home) <= 120000);
