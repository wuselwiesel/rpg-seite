-- Status: eigene Emojis (:name:) und Emojis im Text brauchen etwas mehr Platz
alter table public.profiles drop constraint if exists profiles_presence_emoji_len;
alter table public.profiles add constraint profiles_presence_emoji_len check (presence_emoji is null or char_length(presence_emoji) <= 40);
alter table public.profiles drop constraint if exists profiles_presence_text_len;
alter table public.profiles add constraint profiles_presence_text_len check (presence_text is null or char_length(presence_text) <= 80);
