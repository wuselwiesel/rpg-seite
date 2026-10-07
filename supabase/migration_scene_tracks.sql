-- Migration: Musikliste pro Szene (statt eines einzelnen Musik-Links)
-- * scene_tracks: Links zu Spotify, YouTube, SoundCloud oder Audiodateien; alle Mitspielenden der Welt dürfen welche hinzufügen
--   (bei geheimen Szenen nur, wer sie sehen darf), entfernen darf, wer ihn hinzugefügt hat, die Autor:in der Szene und Welt-Admins
-- * bisherige Musik-Links (story_posts.ambience_music_url) werden als erster Titel übernommen und danach geleert

create table if not exists public.scene_tracks (
  id uuid primary key default gen_random_uuid(),
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  url text not null check (char_length(url) between 1 and 500),
  title text check (title is null or char_length(title) <= 80),
  added_by uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists scene_tracks_story_idx on public.scene_tracks (story_post_id, created_at);

alter table public.scene_tracks enable row level security;

-- Lesen: wer die Szene sehen darf (die Prüfung der Szene folgt ihren eigenen Policies)
drop policy if exists "scene_tracks_select_visible" on public.scene_tracks;
create policy "scene_tracks_select_visible" on public.scene_tracks
  for select to authenticated
  using (exists (select 1 from public.story_posts sp where sp.id = story_post_id));

-- Entfernen: wer hinzugefügt hat, die Autor:in der Szene, Welt-Admins
drop policy if exists "scene_tracks_delete_allowed" on public.scene_tracks;
create policy "scene_tracks_delete_allowed" on public.scene_tracks
  for delete to authenticated
  using (
    added_by = auth.uid()
    or exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = sp.character_id
      where sp.id = story_post_id and (c.owner_id = auth.uid() or public.is_world_admin(sp.world_id))
    )
  );

-- Hinzufügen nur über die Funktion (gleiche Berechtigung wie Ort/Zeit/Atmosphäre einer Szene)
create or replace function public.add_scene_track(p_story_post_id uuid, p_url text, p_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_private boolean;
  v_id uuid;
begin
  select world_id, is_private into v_world, v_private from public.story_posts where id = p_story_post_id;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not (
    exists (select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world and c.deleted_at is null)
    or public.is_world_admin(v_world)
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if v_private and not (
    exists (select 1 from public.story_posts p join public.characters c on c.id = p.character_id where p.id = p_story_post_id and c.owner_id = auth.uid())
    or exists (select 1 from public.story_post_viewers v join public.characters c on c.id = v.character_id where v.story_post_id = p_story_post_id and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if char_length(btrim(coalesce(p_url, ''))) not between 1 and 500 or char_length(coalesce(p_title, '')) > 80 then
    raise exception 'Eingabe ungültig';
  end if;
  if (select count(*) from public.scene_tracks where story_post_id = p_story_post_id) >= 30 then
    raise exception 'Zu viele Titel';
  end if;
  insert into public.scene_tracks (story_post_id, url, title, added_by)
  values (p_story_post_id, btrim(p_url), nullif(btrim(coalesce(p_title, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.add_scene_track(uuid, text, text) from public, anon;
grant execute on function public.add_scene_track(uuid, text, text) to authenticated;

-- Bisherige Einzel-Links übernehmen (Besitzer:in der Szenen-Figur als Hinzufügende:r) und die alte Spalte leeren
insert into public.scene_tracks (story_post_id, url, added_by)
select sp.id, sp.ambience_music_url, c.owner_id
from public.story_posts sp
join public.characters c on c.id = sp.character_id
where sp.ambience_music_url is not null and btrim(sp.ambience_music_url) <> ''
  and not exists (select 1 from public.scene_tracks t where t.story_post_id = sp.id);

update public.story_posts set ambience_music_url = null where ambience_music_url is not null;

notify pgrst, 'reload schema';
