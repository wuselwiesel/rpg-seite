-- Story: selbst geschriebene Zusammenfassung pro Szene (zum Nachlesen). Getrennt von ai_summary (KI) und den Kapitelzeilen.
alter table public.story_posts
  add column if not exists recap text check (recap is null or char_length(recap) <= 8000),
  add column if not exists recap_by uuid references public.profiles (id) on delete set null,
  add column if not exists recap_at timestamptz;

-- Kurzzeitig gebaute Kapitel-Zusammenfassungen (ersetzt durch Szenen-Zusammenfassungen).
drop function if exists public.set_chapter_recap(uuid, text);
alter table public.story_entries
  drop column if exists chapter_recap,
  drop column if exists chapter_recap_by,
  drop column if exists chapter_recap_at;

-- Jede Person mit einem Charakter in der Welt (und die Welt-Besitzer:in) darf die Zusammenfassung einer Szene schreiben, ändern oder
-- (leerer Text) entfernen. Normale Änderungen an der Szene bleiben auf die Autor:in beschränkt.
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
  if v_text is not null and char_length(v_text) > 8000 then
    raise exception 'Die Zusammenfassung ist zu lang (höchstens 8000 Zeichen).';
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
