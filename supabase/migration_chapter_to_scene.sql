-- Kapitel-Marke in einer Szene → eigene Szene („Neues Kapitel = neue Szene“ auch für ältere Kapitel).
-- Die neue Szene bekommt den Namen und das Datum des Kapitels und folgt auf die alte Szene. Der erste Beitrag nach der Marke wird ihr Eröffnungstext,
-- alle weiteren Beiträge ziehen mit um. Die alte Szene wird abgeschlossen (Zusammenfassung = die des Kapitels, falls sie noch keine hat);
-- der Zug (wer ist dran) geht an die neue Szene. Hängt schon eine Folgeszene an der alten, folgt sie danach der neuen.
create or replace function public.chapter_to_scene(p_entry uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.story_entries%rowtype;
  s public.story_posts%rowtype;
  o public.story_entries%rowtype;
  v_new uuid;
  v_next uuid;
  v_recap text;
begin
  select * into m from public.story_entries where id = p_entry and kind = 'chapter';
  if not found then
    raise exception 'Kapitel nicht gefunden';
  end if;
  select * into s from public.story_posts where id = m.story_post_id;
  if not (
    exists (select 1 from public.characters c where c.id = s.character_id and c.owner_id = auth.uid())
    or exists (select 1 from public.characters c where c.id = m.character_id and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = s.world_id and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;

  select * into o from public.story_entries
    where story_post_id = s.id and created_at > m.created_at and kind in ('entry', 'narrator') and roll_label is null
    order by created_at limit 1;

  select id into v_next from public.story_posts where previous_story_id = s.id;
  if v_next is not null then
    update public.story_posts set previous_story_id = null where id = v_next;
  end if;

  insert into public.story_posts (world_id, character_id, arc_id, title, content, tags, is_private, locked, narrator, location,
                                  event_year, event_month, event_day, previous_story_id, turn_character_id, turn_set_at, created_at)
  values (s.world_id, coalesce(o.character_id, m.character_id), s.arc_id, coalesce(nullif(btrim(m.chapter_title), ''), m.content),
          coalesce(o.content, ''), '{}', s.is_private, false, coalesce(o.kind = 'narrator', false), s.location,
          m.event_year, m.event_month, m.event_day, s.id, s.turn_character_id, s.turn_set_at, coalesce(o.created_at, m.created_at))
  returning id into v_new;

  if s.is_private then
    insert into public.story_post_viewers (story_post_id, character_id)
      select v_new, v.character_id from public.story_post_viewers v where v.story_post_id = s.id
      on conflict do nothing;
  end if;

  update public.story_entries set story_post_id = v_new
    where story_post_id = s.id and created_at > m.created_at and (o.id is null or id <> o.id);
  delete from public.story_entries where id = m.id or id = o.id;

  if v_next is not null then
    update public.story_posts set previous_story_id = v_new where id = v_next;
  end if;

  v_recap := nullif(btrim(coalesce(m.chapter_summary, '')), '');
  update public.story_posts
    set locked = true, turn_character_id = null, turn_set_at = null, ai_summary = null, ai_summary_count = null,
        recap = coalesce(recap, case when v_recap is null then null
                                     else '<p>' || replace(replace(replace(v_recap, '&', '&amp;'), '<', '&lt;'), '>', '&gt;') || '</p>' end),
        recap_by = case when recap is null and v_recap is not null then auth.uid() else recap_by end,
        recap_at = case when recap is null and v_recap is not null then now() else recap_at end
    where id = s.id;

  return v_new;
end;
$$;

revoke all on function public.chapter_to_scene(uuid) from public, anon;
grant execute on function public.chapter_to_scene(uuid) to authenticated;

notify pgrst, 'reload schema';
