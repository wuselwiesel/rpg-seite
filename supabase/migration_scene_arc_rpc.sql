-- Migration: Handlungsstrang einer Szene darf jede:r Mitspielende der Welt setzen, auch bei abgeschlossenen Szenen und fremden Szenen
-- (gleiche Berechtigung wie Ort/Zeit/Atmosphäre: Mitspielende der Welt, bei geheimen Szenen nur wer sie sehen darf)

create or replace function public.set_scene_arc(p_story_post_id uuid, p_arc_id uuid)
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
  if p_arc_id is not null and not exists (select 1 from public.story_arcs a where a.id = p_arc_id and a.world_id = v_world) then
    raise exception 'Handlungsstrang nicht gefunden';
  end if;
  update public.story_posts set arc_id = p_arc_id where id = p_story_post_id;
end;
$$;
revoke all on function public.set_scene_arc(uuid, uuid) from public, anon;
grant execute on function public.set_scene_arc(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
