-- Feed pro Welt: Mitglieder einer Welt sehen alle Beiträge der Charaktere dieser Welt, und alle Charaktere einer Welt folgen sich automatisch.

-- Beiträge: sichtbar für alle Mitglieder der Welt, zu der der Charakter gehört (zusätzlich zu den bisherigen Regeln für Freund:innen und gefolgte Welten).
create or replace function public.is_world_member_character(_character_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.characters c
    where c.id = _character_id and public.is_world_member(c.world_id)
  );
$$;

revoke all on function public.is_world_member_character(uuid) from public, anon;
grant execute on function public.is_world_member_character(uuid) to authenticated;

drop policy if exists "posts_select_world_member" on public.posts;
create policy "posts_select_world_member" on public.posts
  for select to authenticated using (public.is_world_member_character(character_id));

-- Automatisch folgen: bestehende Charaktere einer Welt folgen einander ...
insert into public.character_follows (follower_id, followed_id)
select a.id, b.id
from public.characters a
join public.characters b on b.world_id = a.world_id and b.id <> a.id
on conflict do nothing;

-- ... und jeder neue Charakter folgt allen anderen der Welt und wird von allen gefolgt (Entfolgen bleibt danach möglich).
create or replace function public.autofollow_world_characters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.character_follows (follower_id, followed_id)
  select new.id, c.id from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  insert into public.character_follows (follower_id, followed_id)
  select c.id, new.id from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.autofollow_world_characters() from public, anon, authenticated;

drop trigger if exists characters_autofollow_trg on public.characters;
create trigger characters_autofollow_trg after insert on public.characters
  for each row execute procedure public.autofollow_world_characters();

notify pgrst, 'reload schema';
