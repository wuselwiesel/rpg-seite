-- Automatische Folgen (Welt-Automatik) von Hand gesetzten Folgen unterscheiden, damit sie bei den Follower-Badges nicht mitzählen.
alter table public.character_follows add column if not exists auto boolean not null default false;

-- Die einmalige Nachfüllung vom 3.10.2026 (17:52 UTC) war automatisch.
update public.character_follows set auto = true
where created_at >= '2026-10-03 17:52:00+00' and created_at < '2026-10-03 17:53:00+00';

create or replace function public.autofollow_world_characters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.character_follows (follower_id, followed_id, auto)
  select new.id, c.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  insert into public.character_follows (follower_id, followed_id, auto)
  select c.id, new.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.autofollow_world_characters() from public, anon, authenticated;

notify pgrst, 'reload schema';
