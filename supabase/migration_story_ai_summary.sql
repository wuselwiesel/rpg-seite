-- KI-Zusammenfassung pro Szene ("Zuletzt geschah"): gespeichert, damit sie nur einmal erzeugt wird.

alter table public.story_posts
  add column if not exists ai_summary text,
  add column if not exists ai_summary_count integer;

-- Jedes Mitglied der Welt darf die Zusammenfassung speichern (die Tabelle selbst erlaubt Updates nur der Autor:in).
create or replace function public.set_story_summary(p_story_post_id uuid, p_summary text, p_count integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.story_posts sp
    where sp.id = p_story_post_id and public.is_world_member(sp.world_id)
  ) then
    raise exception 'Nicht erlaubt';
  end if;
  update public.story_posts
    set ai_summary = left(p_summary, 2000), ai_summary_count = p_count
    where id = p_story_post_id;
end;
$$;

grant execute on function public.set_story_summary(uuid, text, integer) to authenticated;

notify pgrst, 'reload schema';
