-- Schicksalswürfel je Welt ausschaltbar: kein Würfel, keine eigenen Schicksale, keine Felder dafür im Charakterformular (Standard: an).
alter table public.worlds add column if not exists fate_enabled boolean not null default true;

notify pgrst, 'reload schema';
