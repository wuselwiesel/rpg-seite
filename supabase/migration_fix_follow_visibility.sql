-- Fix: posts/comments "im Feed sichtbar, wenn ich der Welt folge" griff nicht,
-- weil die Policy intern auf `characters` zugreift und dabei selbst wieder an
-- dessen RLS (nur Weltmitglieder) scheiterte. Security-definer-Helfer wie beim
-- Freunde-/Weltmitglieder-Check umgehen das.

create function public.is_followed_world_character(_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.characters c
    join public.world_follows wf on wf.world_id = c.world_id
    where c.id = _character_id and wf.user_id = auth.uid()
  );
$$;

grant execute on function public.is_followed_world_character(uuid) to authenticated;

create function public.is_followed_world_post(_post_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.posts p
    join public.characters c on c.id = p.character_id
    join public.world_follows wf on wf.world_id = c.world_id
    where p.id = _post_id and wf.user_id = auth.uid()
  );
$$;

grant execute on function public.is_followed_world_post(uuid) to authenticated;

drop policy if exists "posts_select_followed_world" on public.posts;
create policy "posts_select_followed_world" on public.posts
  for select to authenticated using (public.is_followed_world_character(character_id));

drop policy if exists "comments_select_followed_world" on public.comments;
create policy "comments_select_followed_world" on public.comments
  for select to authenticated using (public.is_followed_world_post(post_id));

-- Der Feed lädt zu jedem Post den Charakter mit (Name/Avatar) - auch dafür
-- muss `characters` in gefolgten Welten direkt sichtbar sein, sonst zeigt
-- die RLS auf `characters` selbst "Unbekannt" statt des echten Charakters.
drop policy if exists "characters_select_followed_world" on public.characters;
create policy "characters_select_followed_world" on public.characters
  for select to authenticated using (
    exists (
      select 1 from public.world_follows wf
      where wf.world_id = characters.world_id and wf.user_id = auth.uid()
    )
  );
