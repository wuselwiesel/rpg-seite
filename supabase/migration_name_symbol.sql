-- Frei gewähltes Zeichen neben dem Namen (Emoji, Symbol oder eigenes Emoji :name:), pro Charakter und pro Redaktions-Profil.
alter table public.characters add column if not exists name_symbol text;
alter table public.redaktion_profiles add column if not exists name_symbol text;

alter table public.characters drop constraint if exists characters_name_symbol_len;
alter table public.characters add constraint characters_name_symbol_len check (name_symbol is null or char_length(name_symbol) <= 40);
alter table public.redaktion_profiles drop constraint if exists redaktion_profiles_name_symbol_len;
alter table public.redaktion_profiles add constraint redaktion_profiles_name_symbol_len check (name_symbol is null or char_length(name_symbol) <= 40);

notify pgrst, 'reload schema';
