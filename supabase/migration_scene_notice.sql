-- Hinweise an Mitspielende einer Szene („Ich habe meinen Beitrag bearbeitet“, eigener Text): Drosselung gegen Spam.
-- Höchstens ein Hinweis alle 15 Sekunden pro Szene. Wie touch_turn_reminder, nur für Mitglieder der Welt.
alter table public.story_posts add column if not exists last_notice_at timestamptz;

create or replace function public.touch_scene_notice(p_story_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_last timestamptz;
begin
  select world_id, last_notice_at into v_world, v_last from public.story_posts where id = p_story_post_id;
  if v_world is null or not public.is_world_member(v_world) then return false; end if;
  if v_last is not null and v_last > now() - interval '15 seconds' then return false; end if;
  update public.story_posts set last_notice_at = now() where id = p_story_post_id;
  return true;
end;
$$;

grant execute on function public.touch_scene_notice(uuid) to authenticated;
