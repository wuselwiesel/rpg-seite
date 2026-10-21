-- Einladungen in eine Welt: die eingeladene Person nimmt an oder lehnt ab (vorher wurde sie ohne Rückfrage Mitglied).
-- Anlegen, Antworten und Zurückziehen laufen nur über die Funktionen unten; die Tabelle selbst hat nur eine Leseregel.
create table if not exists public.world_member_invites (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create unique index if not exists world_member_invites_pending_uidx on public.world_member_invites (world_id, invited_user_id) where status = 'pending';
create index if not exists world_member_invites_user_idx on public.world_member_invites (invited_user_id, status);
create index if not exists world_member_invites_by_idx on public.world_member_invites (invited_by);
alter table public.world_member_invites enable row level security;

create policy "world_member_invites_select" on public.world_member_invites
  for select to authenticated using (
    invited_user_id = (select auth.uid())
    or invited_by = (select auth.uid())
    or public.is_world_admin(world_id)
  );

create or replace function public.invite_to_world(p_world uuid, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_id uuid;
begin
  if v_me is null then raise exception 'Nicht angemeldet.'; end if;
  if not public.is_world_admin(p_world) then raise exception 'Nur Admins können einladen.'; end if;
  if p_user = v_me then raise exception 'Du bist schon in dieser Welt.'; end if;
  if not public.is_friend_of(p_user) then raise exception 'Du kannst nur Freund:innen einladen.'; end if;
  if exists (select 1 from public.world_members where world_id = p_world and user_id = p_user) then
    raise exception 'Diese Person ist schon in der Welt.';
  end if;
  insert into public.world_member_invites (world_id, invited_user_id, invited_by)
    values (p_world, p_user, v_me) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'Diese Person ist schon eingeladen.';
end;
$$;

create or replace function public.respond_world_invite(p_invite uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  i record;
begin
  select * into i from public.world_member_invites where id = p_invite for update;
  if not found or i.invited_user_id is distinct from v_me then raise exception 'Einladung nicht gefunden.'; end if;
  if i.status <> 'pending' then raise exception 'Diese Einladung ist nicht mehr offen.'; end if;
  if p_accept then
    insert into public.world_members (world_id, user_id, role) values (i.world_id, v_me, 'member') on conflict do nothing;
  end if;
  update public.world_member_invites
    set status = case when p_accept then 'accepted' else 'declined' end, decided_at = now()
    where id = p_invite;
  return jsonb_build_object('world_id', i.world_id, 'invited_by', i.invited_by, 'accepted', p_accept);
end;
$$;

create or replace function public.withdraw_world_invite(p_invite uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  i record;
begin
  select * into i from public.world_member_invites where id = p_invite for update;
  if not found then raise exception 'Einladung nicht gefunden.'; end if;
  if not (i.invited_by = v_me or public.is_world_admin(i.world_id)) then raise exception 'Keine Berechtigung'; end if;
  if i.status <> 'pending' then raise exception 'Diese Einladung ist nicht mehr offen.'; end if;
  update public.world_member_invites set status = 'withdrawn', decided_at = now() where id = p_invite;
end;
$$;

-- Offene Einladungen an mich samt Welt und Absender:in (die Welt ist für Nicht-Mitglieder sonst nicht lesbar)
create or replace function public.my_world_invites()
returns table(id uuid, world_id uuid, world_name text, cover_image_url text, description text, invited_by_name text, invited_by_avatar_url text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, w.id, w.name, w.cover_image_url, w.description,
         coalesce(nullif(p.nickname, ''), p.username), p.avatar_url, i.created_at
  from public.world_member_invites i
  join public.worlds w on w.id = i.world_id
  join public.profiles p on p.id = i.invited_by
  where i.invited_user_id = auth.uid() and i.status = 'pending'
  order by i.created_at desc;
$$;

revoke all on function public.invite_to_world(uuid, uuid) from public, anon;
revoke all on function public.respond_world_invite(uuid, boolean) from public, anon;
revoke all on function public.withdraw_world_invite(uuid) from public, anon;
revoke all on function public.my_world_invites() from public, anon;
grant execute on function public.invite_to_world(uuid, uuid) to authenticated;
grant execute on function public.respond_world_invite(uuid, boolean) to authenticated;
grant execute on function public.withdraw_world_invite(uuid) to authenticated;
grant execute on function public.my_world_invites() to authenticated;
