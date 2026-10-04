-- Neues Kapitel = neue Szene: Die Folgeszene verweist auf die vorherige, die vorherige wird abgeschlossen (und bekommt auf Wunsch eine Zusammenfassung).
alter table public.story_posts
  add column if not exists previous_story_id uuid references public.story_posts (id) on delete set null;

-- Höchstens eine Folgeszene je Szene
create unique index if not exists story_posts_previous_unique on public.story_posts (previous_story_id) where previous_story_id is not null;

-- Schließt die vorherige Szene ab. Erlaubt, wenn die Folgeszene von dir stammt und auf sie verweist und du in der alten Szene mitgespielt hast
-- (angelegt, Beitrag geschrieben) oder Welt-Besitzer:in bist.
create or replace function public.finish_scene_for_next(p_previous uuid, p_next uuid, p_recap text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_recap text := nullif(btrim(coalesce(p_recap, '')), '');
begin
  select world_id into v_world from public.story_posts where id = p_previous;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not exists (
    select 1 from public.story_posts n
    join public.characters c on c.id = n.character_id
    where n.id = p_next and n.previous_story_id = p_previous and n.world_id = v_world and c.owner_id = auth.uid()
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if not (
    exists (select 1 from public.story_posts p join public.characters c on c.id = p.character_id where p.id = p_previous and c.owner_id = auth.uid())
    or exists (select 1 from public.story_entries e join public.characters c on c.id = e.character_id where e.story_post_id = p_previous and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if v_recap is not null and char_length(v_recap) > 30000 then
    raise exception 'Die Zusammenfassung ist zu lang.';
  end if;
  update public.story_posts
    set locked = true,
        recap = coalesce(v_recap, recap),
        recap_by = case when v_recap is null then recap_by else auth.uid() end,
        recap_at = case when v_recap is null then recap_at else now() end
    where id = p_previous;
end;
$$;

revoke all on function public.finish_scene_for_next(uuid, uuid, text) from public, anon;
grant execute on function public.finish_scene_for_next(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
