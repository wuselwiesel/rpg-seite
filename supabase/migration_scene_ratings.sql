-- Bewertung der gesamten Szene, sobald sie abgeschlossen ist (Sterne, was gefiel, was weniger).
-- Anders als die Session-Bewertung (scene_session_ratings) gilt sie für die ganze Szene. Eine Bewertung je Person, nur bei abgeschlossenen Szenen.
-- Wer mitspielt, wird in der App geprüft (session-actions.ts); die Datenbank sichert „eigene Zeile“, „Szene sichtbar“ und „abgeschlossen“.

create table if not exists public.scene_ratings (
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Charakter, mit dem die Person in dieser Welt gerade unterwegs ist (für die Anzeige)
  character_id uuid references public.characters (id) on delete set null,
  stars smallint not null check (stars between 1 and 5),
  liked text check (liked is null or char_length(liked) <= 600),
  disliked text check (disliked is null or char_length(disliked) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_post_id, user_id)
);

alter table public.scene_ratings enable row level security;

-- Lesen: wer die Szene sehen darf (die Unterabfrage läuft mit den Rechten der Person, also mit den Regeln für story_posts)
drop policy if exists "scene_ratings_select" on public.scene_ratings;
create policy "scene_ratings_select" on public.scene_ratings
  for select to authenticated
  using (exists (select 1 from public.story_posts sp where sp.id = story_post_id));

-- Bewerten: nur die eigene Zeile, nur bei einer sichtbaren und abgeschlossenen Szene
drop policy if exists "scene_ratings_insert" on public.scene_ratings;
create policy "scene_ratings_insert" on public.scene_ratings
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.story_posts sp where sp.id = story_post_id and sp.locked));

drop policy if exists "scene_ratings_update" on public.scene_ratings;
create policy "scene_ratings_update" on public.scene_ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "scene_ratings_delete" on public.scene_ratings;
create policy "scene_ratings_delete" on public.scene_ratings
  for delete to authenticated
  using (user_id = (select auth.uid()));
