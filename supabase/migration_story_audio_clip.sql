-- Musik-Ausschnitt einer Story: Startzeit und Länge (Sekunden) innerhalb des Songs.
alter table public.stories add column if not exists audio_start real not null default 0;
alter table public.stories add column if not exists audio_length real;
