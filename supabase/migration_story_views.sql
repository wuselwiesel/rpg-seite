-- Wer hat meine Story gesehen? Pro Story und Charakter ein Eintrag. Sehen darf die Liste nur der Account, dem die Story gehört
-- (nicht die Welt-Besitzerin, nicht andere Mitglieder). Eintragen darf jede Person mit einem eigenen Charakter, nicht für die eigene Story.
create table if not exists public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, character_id)
);
create index if not exists story_views_character_idx on public.story_views (character_id);
alter table public.story_views enable row level security;

create policy "story_views_select_story_owner" on public.story_views
  for select to authenticated using (
    exists (
      select 1 from public.stories s join public.characters c on c.id = s.character_id
      where s.id = story_id and c.owner_id = auth.uid()
    )
  );
create policy "story_views_insert_own" on public.story_views
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    and not exists (
      select 1 from public.stories s join public.characters c on c.id = s.character_id
      where s.id = story_id and c.owner_id = auth.uid()
    )
  );
