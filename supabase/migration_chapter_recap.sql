-- Story: selbst geschriebene Zusammenfassung pro Kapitel (zum Nachlesen). Getrennt von chapter_summary (kurze Zeile unter dem Titel).
alter table public.story_entries
  add column if not exists chapter_recap text check (chapter_recap is null or char_length(chapter_recap) <= 8000),
  add column if not exists chapter_recap_by uuid references public.profiles (id) on delete set null,
  add column if not exists chapter_recap_at timestamptz;

-- Jede Person mit einem Charakter in der Welt (und die Welt-Besitzer:in) darf die Zusammenfassung eines Kapitels schreiben oder ändern;
-- leerer Text entfernt sie. Normale Änderungen an Einträgen bleiben weiter auf die Autor:in beschränkt.
create or replace function public.set_chapter_recap(p_entry_id uuid, p_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_text text := nullif(btrim(coalesce(p_text, '')), '');
begin
  select sp.world_id into v_world
  from public.story_entries e
  join public.story_posts sp on sp.id = e.story_post_id
  where e.id = p_entry_id and e.kind = 'chapter';
  if v_world is null then
    raise exception 'Kapitel nicht gefunden';
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
  update public.story_entries
    set chapter_recap = v_text,
        chapter_recap_by = case when v_text is null then null else auth.uid() end,
        chapter_recap_at = case when v_text is null then null else now() end
    where id = p_entry_id;
end;
$$;

revoke all on function public.set_chapter_recap(uuid, text) from public, anon;
grant execute on function public.set_chapter_recap(uuid, text) to authenticated;

notify pgrst, 'reload schema';
