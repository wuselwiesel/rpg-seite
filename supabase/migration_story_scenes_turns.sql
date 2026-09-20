-- Migration: Szenen mit Ort/Zeit, Kapitel, Erzähler-Einträge, "Wer ist dran?"

alter table public.story_posts
  add column if not exists location text,
  add column if not exists in_world_time text,
  add column if not exists turn_character_id uuid references public.characters (id) on delete set null,
  add column if not exists turn_set_at timestamptz,
  add column if not exists last_reminder_at timestamptz;

create index if not exists story_posts_location_idx on public.story_posts (world_id, location);
create index if not exists story_posts_turn_idx on public.story_posts (turn_character_id);

alter table public.story_entries
  add column if not exists kind text not null default 'entry',
  add column if not exists chapter_title text,
  add column if not exists chapter_summary text;

alter table public.story_entries drop constraint if exists story_entries_kind_check;
alter table public.story_entries
  add constraint story_entries_kind_check check (kind in ('entry', 'narrator', 'chapter'));

-- Die Autor:in einer Szene darf Ort/Zeit nachträglich ändern.
drop policy if exists "story_posts_update_author" on public.story_posts;
create policy "story_posts_update_author" on public.story_posts
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- Wer ist als Nächstes dran? Darf jede Person setzen, die in der Welt einen
-- Charakter hat (das Schreiben der Fortsetzung setzt es automatisch).
create or replace function public.set_story_turn(p_story_post_id uuid, p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
begin
  select world_id into v_world from public.story_posts where id = p_story_post_id;
  if v_world is null then return; end if;
  if not exists (
    select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if p_character_id is not null and not exists (
    select 1 from public.characters c where c.id = p_character_id and c.world_id = v_world
  ) then
    raise exception 'Ungültiger Charakter';
  end if;
  update public.story_posts
    set turn_character_id = p_character_id, turn_set_at = now()
    where id = p_story_post_id;
end;
$$;

grant execute on function public.set_story_turn(uuid, uuid) to authenticated;

-- Erinnerungen sind auf eine alle 30 Minuten pro Szene begrenzt.
create or replace function public.touch_turn_reminder(p_story_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_last timestamptz;
begin
  select world_id, last_reminder_at into v_world, v_last from public.story_posts where id = p_story_post_id;
  if v_world is null or not public.is_world_member(v_world) then return false; end if;
  if v_last is not null and v_last > now() - interval '30 minutes' then return false; end if;
  update public.story_posts set last_reminder_at = now() where id = p_story_post_id;
  return true;
end;
$$;

grant execute on function public.touch_turn_reminder(uuid) to authenticated;
