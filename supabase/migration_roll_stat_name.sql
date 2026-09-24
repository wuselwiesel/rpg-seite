-- Zusätzliches Feld für Würfe: der Name des Werts/Skills vom Charakterbogen
-- (z.B. "Überzeugen/Manipulieren"), getrennt vom frei formulierten roll_label.
alter table public.story_entries add column if not exists roll_stat_name text;
