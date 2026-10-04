-- Online-Status: Der grüne Punkt kann durch ein eigenes Emoji (und optional einen kurzen Text) ersetzt werden.
-- Einstellbar im Redaktionsprofil; die Werte gehören zum eigenen Account (Policy profiles_update_own).
alter table public.profiles add column if not exists presence_emoji text;
alter table public.profiles add column if not exists presence_text text;
alter table public.profiles drop constraint if exists profiles_presence_emoji_len;
alter table public.profiles add constraint profiles_presence_emoji_len check (presence_emoji is null or char_length(presence_emoji) <= 16);
alter table public.profiles drop constraint if exists profiles_presence_text_len;
alter table public.profiles add constraint profiles_presence_text_len check (presence_text is null or char_length(presence_text) <= 40);
