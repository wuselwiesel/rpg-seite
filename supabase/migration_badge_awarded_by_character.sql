-- Welcher Charakter hat ein Badge verliehen? ("Verliehen von Mira", Benachrichtigung "Mira hat dir das Badge ... verliehen")
alter table public.badge_awards add column if not exists awarded_by_character_id uuid references public.characters (id) on delete set null;

notify pgrst, 'reload schema';
