-- Charakterprofil im Stil des Redaktions-Profils: Banner, Status-Zeile und eigene Felder.
alter table public.characters add column if not exists banner_url text;
alter table public.characters add column if not exists status_text text;
alter table public.characters add column if not exists custom_fields jsonb not null default '[]'::jsonb;

alter table public.characters drop constraint if exists characters_profile_limits;
alter table public.characters add constraint characters_profile_limits check (
  char_length(coalesce(status_text, '')) <= 80
  and jsonb_typeof(custom_fields) = 'array'
  and jsonb_array_length(custom_fields) <= 12
);

notify pgrst, 'reload schema';
