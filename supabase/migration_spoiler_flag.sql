-- Migration: Spoiler-Marke für ganze Szenen und einzelne Story-Nachrichten
-- Markierte Szenen/Nachrichten werden in der App verborgen, bis man sie anklickt. Gesetzt wird die Marke von den
-- bisherigen Berechtigten (Autor:in bzw. Welt-Besitzer:in, über die vorhandenen Update-Policies).

alter table public.story_posts add column if not exists is_spoiler boolean not null default false;
alter table public.story_entries add column if not exists is_spoiler boolean not null default false;

notify pgrst, 'reload schema';
