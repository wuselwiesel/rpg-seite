-- Besondere Naturen einer Welt (Name + Attribut-Boni je Natur); null = die zwei Standard-Naturen Werwolf und Vampir.
alter table public.worlds add column if not exists nature_config jsonb;

-- Neue Welten starten ohne Würfeln (bestehende Welten behalten ihren Wert).
alter table public.worlds alter column dice_enabled set default false;

notify pgrst, 'reload schema';
