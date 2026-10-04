-- Zustand beim Würfeln (z. B. „Betrunken (stark)“): der Malus steckt schon im Bonus des Wurfs, hier steht nur die Bezeichnung für die Anzeige.
alter table public.story_entries add column if not exists roll_condition text;
alter table public.story_entries drop constraint if exists story_entries_roll_condition_len;
alter table public.story_entries add constraint story_entries_roll_condition_len check (roll_condition is null or char_length(roll_condition) <= 40);
