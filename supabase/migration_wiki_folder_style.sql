-- Wiki-Ordner: frei wählbares Icon (Emoji oder :eigenes:) und Farbe aus einer festen Auswahl.
alter table public.wiki_folders add column if not exists icon text check (icon is null or char_length(icon) <= 40);
alter table public.wiki_folders add column if not exists color text check (color is null or color in ('rose','peach','gold','sage','teal','sky','slate','plum','gray'));
