-- Migration: Wer in derselben Welt ist, ist automatisch befreundet.
-- * Trigger: tritt jemand einer Welt bei, wird sie/er mit allen bisherigen Mitgliedern befreundet (bestehende offene Anfragen gelten als angenommen)
-- * Einmalig für bestehende Welten nachgetragen
-- Beendet jemand eine Freundschaft, bleibt sie beendet, bis eine der beiden Personen einer weiteren gemeinsamen Welt beitritt.

create or replace function public.world_members_auto_friends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.friendships (requester_id, addressee_id, status)
  select new.user_id, m.user_id, 'accepted'
  from public.world_members m
  where m.world_id = new.world_id
    and m.user_id <> new.user_id
    and not exists (
      select 1 from public.friendships f
      where (f.requester_id = new.user_id and f.addressee_id = m.user_id)
         or (f.requester_id = m.user_id and f.addressee_id = new.user_id)
    );

  update public.friendships f
  set status = 'accepted'
  where f.status = 'pending'
    and exists (
      select 1 from public.world_members m
      where m.world_id = new.world_id
        and m.user_id <> new.user_id
        and ((f.requester_id = new.user_id and f.addressee_id = m.user_id)
          or (f.requester_id = m.user_id and f.addressee_id = new.user_id))
    );
  return new;
end;
$$;
revoke all on function public.world_members_auto_friends() from public, anon, authenticated;

drop trigger if exists world_members_auto_friends_trg on public.world_members;
create trigger world_members_auto_friends_trg
  after insert on public.world_members
  for each row execute function public.world_members_auto_friends();

-- Bestehende Welten: alle Paare, die eine Welt teilen
insert into public.friendships (requester_id, addressee_id, status)
select distinct a.user_id, b.user_id, 'accepted'
from public.world_members a
join public.world_members b on b.world_id = a.world_id and a.user_id < b.user_id
where not exists (
  select 1 from public.friendships f
  where (f.requester_id = a.user_id and f.addressee_id = b.user_id)
     or (f.requester_id = b.user_id and f.addressee_id = a.user_id)
);

update public.friendships f
set status = 'accepted'
where f.status = 'pending'
  and exists (
    select 1 from public.world_members a
    join public.world_members b on b.world_id = a.world_id and a.user_id <> b.user_id
    where (f.requester_id = a.user_id and f.addressee_id = b.user_id)
  );

notify pgrst, 'reload schema';
