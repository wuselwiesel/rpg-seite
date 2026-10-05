-- Ort, Zeit, Datum und Kurzbeschreibung einer Szene dürfen alle ändern, die in der Welt mitspielen (und die Welt-Besitzer:in/Admins), nicht nur die Autor:in.
-- Geheime Szenen: nur wer sie sehen darf (Autor:in, ausgewählte Charaktere, Welt-Besitzer:in).
create or replace function public.set_scene_meta(
  p_story_post_id uuid,
  p_location text, p_in_world_time text, p_short_summary text,
  p_year integer, p_month smallint, p_day smallint,
  p_end_year integer, p_end_month smallint, p_end_day smallint
)
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
    exists (select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world)
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
  if char_length(coalesce(p_short_summary, '')) > 300 or char_length(coalesce(p_location, '')) > 80 or char_length(coalesce(p_in_world_time, '')) > 80 then
    raise exception 'Eingabe zu lang';
  end if;
  update public.story_posts
    set location = nullif(btrim(coalesce(p_location, '')), ''),
        in_world_time = nullif(btrim(coalesce(p_in_world_time, '')), ''),
        short_summary = nullif(btrim(coalesce(p_short_summary, '')), ''),
        event_year = p_year, event_month = p_month, event_day = p_day,
        event_end_year = p_end_year, event_end_month = p_end_month, event_end_day = p_end_day
    where id = p_story_post_id;
end;
$$;

revoke all on function public.set_scene_meta(uuid, text, text, text, integer, smallint, smallint, integer, smallint, smallint) from public, anon;
grant execute on function public.set_scene_meta(uuid, text, text, text, integer, smallint, smallint, integer, smallint, smallint) to authenticated;

notify pgrst, 'reload schema';
