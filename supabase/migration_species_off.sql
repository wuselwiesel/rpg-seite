-- Wesen je Welt abschaltbar: Das Feld „Wesen“ (Liste mit is_species) entfällt dann beim Anlegen und Bearbeiten, im Profil und in den Filtern.
-- Schon gewählte Werte bleiben erhalten und kommen beim Wiedereinschalten zurück. Gilt nur für die Wesen-Liste.
alter table public.world_choice_lists add column if not exists disabled boolean not null default false;

notify pgrst, 'reload schema';
