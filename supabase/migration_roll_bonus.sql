-- Bonus/Malus (Erschwernis/Erleichterung), der beim Würfeln auf den Wert angerechnet wurde.
-- roll_value bleibt der Basiswert; roll_bonus wird nur gespeichert, wenn ungleich 0.
alter table public.story_entries add column if not exists roll_bonus integer;
