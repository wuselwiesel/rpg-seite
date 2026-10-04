-- Verknüpfung „Folgeszene“ nachträglich ändern: Die Datenbank sorgt dafür, dass die vorherige Szene aus derselben Welt stammt, nicht die Szene selbst ist und keine Kette im Kreis läuft.
create or replace function public.story_posts_check_previous()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cur uuid;
  depth int := 0;
  v_world uuid;
begin
  if new.previous_story_id is null then
    return new;
  end if;
  if new.previous_story_id = new.id then
    raise exception 'Eine Szene kann nicht auf sich selbst folgen';
  end if;
  select world_id into v_world from public.story_posts where id = new.previous_story_id;
  if v_world is distinct from new.world_id then
    raise exception 'Die vorherige Szene muss aus derselben Welt sein';
  end if;
  cur := new.previous_story_id;
  while cur is not null and depth < 1000 loop
    if cur = new.id then
      raise exception 'Die Szenen würden im Kreis laufen';
    end if;
    select previous_story_id into cur from public.story_posts where id = cur;
    depth := depth + 1;
  end loop;
  return new;
end;
$$;

drop trigger if exists story_posts_check_previous_trg on public.story_posts;
create trigger story_posts_check_previous_trg
  before insert or update of previous_story_id on public.story_posts
  for each row execute function public.story_posts_check_previous();

notify pgrst, 'reload schema';
