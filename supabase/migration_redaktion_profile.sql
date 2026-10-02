-- Redaktions-Profil: Banner, Bio, Status-Zeile, eigene Felder, Farben/Schrift und angeheftete Beiträge.
-- Eine Zeile pro Account (nicht pro Charakter); sichtbar für die Person selbst und ihre akzeptierten Freund:innen.
create table if not exists public.redaktion_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text,
  status_text text,
  banner_url text,
  theme_font text,
  theme_accent text,
  theme_bg text,
  -- [{ "icon": "📚", "title": "Lieblingsbuch", "text": "..." }, ...]
  custom_fields jsonb not null default '[]'::jsonb,
  pinned_post_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint redaktion_profiles_theme_format check (
    (theme_accent is null or theme_accent ~ '^#[0-9a-fA-F]{6}$')
    and (theme_bg is null or theme_bg ~ '^#[0-9a-fA-F]{6}$')
    and (theme_font is null or theme_font ~ '^[a-zA-Z0-9]{1,40}$')
  ),
  constraint redaktion_profiles_limits check (
    char_length(coalesce(bio, '')) <= 600
    and char_length(coalesce(status_text, '')) <= 80
    and jsonb_typeof(custom_fields) = 'array'
    and jsonb_array_length(custom_fields) <= 12
    and cardinality(pinned_post_ids) <= 3
  )
);

alter table public.redaktion_profiles enable row level security;

drop policy if exists "redaktion_profiles_select_own_or_friends" on public.redaktion_profiles;
create policy "redaktion_profiles_select_own_or_friends" on public.redaktion_profiles
  for select to authenticated using (user_id = auth.uid() or public.is_friend_of(user_id));

drop policy if exists "redaktion_profiles_insert_own" on public.redaktion_profiles;
create policy "redaktion_profiles_insert_own" on public.redaktion_profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "redaktion_profiles_update_own" on public.redaktion_profiles;
create policy "redaktion_profiles_update_own" on public.redaktion_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
