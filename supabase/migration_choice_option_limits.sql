-- Höchstzahl je Eintrag einer Auswahlliste (z. B. höchstens 2 Vampire in der Welt); null = unbegrenzt.
alter table public.world_choice_options add column if not exists max_count integer check (max_count is null or (max_count >= 1 and max_count <= 999));

notify pgrst, 'reload schema';
