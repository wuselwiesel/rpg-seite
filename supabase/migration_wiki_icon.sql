
-- Wiki: Icon (durchsichtig, nicht zugeschnitten) zusätzlich zum Titelbild
alter table public.wiki_pages add column if not exists icon_url text check (icon_url is null or char_length(icon_url) <= 500);
