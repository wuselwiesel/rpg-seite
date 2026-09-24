-- Migration: Geschlecht und Wesen (Mensch/Vampir/Werwolf) pro Charakter –
-- Grundlage für die Filter des Schicksalswürfels (und generell fürs Profil nutzbar).

alter table public.characters add column if not exists gender text;
alter table public.characters drop constraint if exists characters_gender_check;
alter table public.characters add constraint characters_gender_check
  check (gender is null or gender in ('maennlich', 'weiblich', 'divers'));

alter table public.characters add column if not exists species text not null default 'mensch';
alter table public.characters drop constraint if exists characters_species_check;
alter table public.characters add constraint characters_species_check
  check (species in ('mensch', 'vampir', 'werwolf'));
