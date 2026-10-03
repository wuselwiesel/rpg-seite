-- Das Datum einer Szene dürfen alle ändern, die in der Welt mitspielen (wie die Zusammenfassung), nicht nur die Autor:in.
create or replace function public.set_scene_dates(
  p_story_post_id uuid,
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
begin
  select world_id into v_world from public.story_posts where id = p_story_post_id;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not (
    exists (select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world)
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.story_posts
    set event_year = p_year, event_month = p_month, event_day = p_day,
        event_end_year = p_end_year, event_end_month = p_end_month, event_end_day = p_end_day
    where id = p_story_post_id;
end;
$$;

revoke all on function public.set_scene_dates(uuid, integer, smallint, smallint, integer, smallint, smallint) from public, anon;
grant execute on function public.set_scene_dates(uuid, integer, smallint, smallint, integer, smallint, smallint) to authenticated;
