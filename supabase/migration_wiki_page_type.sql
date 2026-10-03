-- Wiki: Typ einer Seite (Ort, Spezies, Organisation, ...). Optional; bestehende Seiten bleiben ohne Typ.
alter table public.wiki_pages add column if not exists page_type text;
alter table public.wiki_pages drop constraint if exists wiki_pages_page_type_check;
alter table public.wiki_pages add constraint wiki_pages_page_type_check
  check (page_type is null or page_type in ('ort','spezies','organisation','person','ereignis','mythos','gegenstand'));
create index if not exists wiki_pages_type_idx on public.wiki_pages (world_id, page_type);
notify pgrst, 'reload schema';
