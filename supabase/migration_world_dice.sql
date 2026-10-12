-- Würfeln pro Welt an- und ausschaltbar (aus: kein Würfelreiter, keine Attribute/Talente im ChaBo)
alter table public.worlds add column if not exists dice_enabled boolean not null default true;

notify pgrst, 'reload schema';
