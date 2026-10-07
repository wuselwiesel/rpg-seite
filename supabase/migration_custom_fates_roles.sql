-- Migration: Bedingungen je Rolle bei eigenen Schicksalen.
-- roles = {"1": {"gender": "weiblich", "species": ["vampir"]}, "2": {"relation": "partner"}, ...}
-- Schlüssel 1 = Charakter 1, 2 = {character2}, 3 = {character3}; relation nur für 2 und 3 (Partner:in bzw. beste:r Freund:in von Charakter 1).
alter table public.world_custom_fates add column if not exists roles jsonb not null default '{}'::jsonb;
alter table public.world_custom_fates drop constraint if exists world_custom_fates_roles_object;
alter table public.world_custom_fates add constraint world_custom_fates_roles_object check (jsonb_typeof(roles) = 'object');

notify pgrst, 'reload schema';
