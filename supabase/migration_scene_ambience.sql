-- Migration: Atmosphäre einer Szene (Hintergrundbild und Musik-Link)
-- Wie Ort/Zeit/Datum dürfen alle ändern, die in der Welt mitspielen (und Admins); bei geheimen Szenen nur, wer sie sehen darf.

alter table public.story_posts add column if not exists ambience_image_url text;
alter table public.story_posts add column if not exists ambience_music_url text;

create or replace function public.set_scene_ambience(p_story_post_id uuid, p_image text, p_music text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_private boolean;
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
  if char_length(coalesce(p_image, '')) > 500 or char_length(coalesce(p_music, '')) > 500 then
    raise exception 'Eingabe zu lang';
  end if;
  update public.story_posts
    set ambience_image_url = nullif(btrim(coalesce(p_image, '')), ''),
        ambience_music_url = nullif(btrim(coalesce(p_music, '')), '')
    where id = p_story_post_id;
end;
$$;

revoke all on function public.set_scene_ambience(uuid, text, text) from public, anon;
grant execute on function public.set_scene_ambience(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
