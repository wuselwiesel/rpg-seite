-- Szenen-Zusammenfassung ist jetzt formatierter Text (HTML wie bei den anderen Texten), daher größeres Zeichenlimit.
alter table public.story_posts drop constraint if exists story_posts_recap_check;
alter table public.story_posts add constraint story_posts_recap_check check (recap is null or char_length(recap) <= 30000);

create or replace function public.set_scene_recap(p_story_post_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
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
  if v_text is not null and char_length(v_text) > 30000 then
    raise exception 'Die Zusammenfassung ist zu lang.';
  end if;
  update public.story_posts
    set recap = v_text,
        recap_by = case when v_text is null then null else auth.uid() end,
        recap_at = case when v_text is null then null else now() end
    where id = p_story_post_id;
end;
$$;

revoke all on function public.set_scene_recap(uuid, text) from public, anon;
grant execute on function public.set_scene_recap(uuid, text) to authenticated;

notify pgrst, 'reload schema';
