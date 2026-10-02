-- Standard-Schrift im Konto (statt nur im Browser): gilt für neuen Text im Editor auf allen Geräten.
alter table public.profiles add column if not exists default_font text;
alter table public.profiles drop constraint if exists profiles_default_font_format;
alter table public.profiles add constraint profiles_default_font_format check (default_font is null or default_font ~ '^[a-zA-Z0-9]{1,40}$');

notify pgrst, 'reload schema';
