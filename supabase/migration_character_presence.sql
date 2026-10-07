-- Migration: Online/Offline je Charakter (grüner/grauer Punkt). Gilt, bis die Besitzer:in es ändert.
-- Ersetzt den Chat-Status („AFK“, „denkt nach“ …), der nur im Browser lebte.
alter table public.characters add column if not exists presence_online boolean not null default false;

notify pgrst, 'reload schema';
