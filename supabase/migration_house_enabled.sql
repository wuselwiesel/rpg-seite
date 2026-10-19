-- „Haus / Familie“ bei Charakteren je Welt ausschaltbar (Standard: an): kein Feld im Formular, keine Haus-Filter in Stammbaum und Beziehungsnetz.
alter table public.worlds add column if not exists house_enabled boolean not null default true;

notify pgrst, 'reload schema';
