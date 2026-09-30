-- Verbleibende Glückspunkte (aus dem Charakterbogen, Attribut "Glück") je Wurf, für die
-- "Glückspunkt einsetzen: nochmal würfeln"-Funktion in Story-Würfen.
alter table public.story_entries add column if not exists roll_luck_remaining integer;
