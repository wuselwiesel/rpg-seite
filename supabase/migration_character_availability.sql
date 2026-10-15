-- Aufenthalt und Verfügbarkeit eines Charakters: frei oder beschäftigt (z. B. in einer Szene) und wo er sich gerade befindet.
-- Die Besitzer:in setzt beides selbst (bestehende Update-Policies der Charaktere); alle in der Welt sehen es.
alter table public.characters add column if not exists availability text;
alter table public.characters add column if not exists location text;
do $$ begin
  alter table public.characters add constraint characters_availability_check check (availability is null or availability in ('free', 'busy'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.characters add constraint characters_location_len check (location is null or char_length(location) <= 60);
exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
