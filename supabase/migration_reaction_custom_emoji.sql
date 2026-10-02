-- Redaktions-Reaktionen dürfen auch eigene Emojis (:name:) sein; dafür reicht die alte Grenze von 16 Zeichen nicht.
alter table public.redaktion_reactions drop constraint if exists redaktion_reactions_emoji_check;
alter table public.redaktion_reactions
  add constraint redaktion_reactions_emoji_check check (char_length(emoji) between 1 and 40);

notify pgrst, 'reload schema';
