-- Beitritt zu Welten: offen, auf Anfrage (Genehmigung durch Admins) oder nur durch Einladung der Admins
alter table public.worlds add column if not exists join_mode text not null default 'open';
alter table public.worlds drop constraint if exists worlds_join_mode_check;
alter table public.worlds add constraint worlds_join_mode_check check (join_mode in ('open', 'request', 'invite'));

create table if not exists public.world_join_requests (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz
);

create unique index if not exists world_join_requests_pending_idx on public.world_join_requests (world_id, user_id) where status = 'pending';
create index if not exists world_join_requests_world_idx on public.world_join_requests (world_id, status);
create index if not exists world_join_requests_user_idx on public.world_join_requests (user_id);

alter table public.world_join_requests enable row level security;

drop policy if exists world_join_requests_select on public.world_join_requests;
create policy world_join_requests_select on public.world_join_requests
  for select to authenticated using (user_id = (select auth.uid()) or public.is_world_admin(world_id));

drop policy if exists world_join_requests_insert on public.world_join_requests;
create policy world_join_requests_insert on public.world_join_requests
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and not public.is_world_member(world_id)
    and exists (select 1 from public.worlds w where w.id = world_id and w.join_mode = 'request')
  );

drop policy if exists world_join_requests_delete on public.world_join_requests;
create policy world_join_requests_delete on public.world_join_requests
  for delete to authenticated using (user_id = (select auth.uid()) and status = 'pending');

-- Selbst beitreten nur in offenen Welten (oder als Besitzer:in beim Anlegen); sonst per Genehmigung oder Einladung der Admins
alter policy "world_members_insert" on public.world_members with check (
  role = 'member'
  and (
    (user_id = (select auth.uid()) and exists (
      select 1 from public.worlds w
      where w.id = world_id and (w.join_mode = 'open' or w.created_by = (select auth.uid()))
    ))
    or (public.is_world_admin(world_id) and public.is_friend_of(user_id))
  )
);

-- Anfrage entscheiden (nur Admins der Welt); bei Annahme wird die Person Mitglied
create or replace function public.decide_join_request(p_request uuid, p_approve boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.world_join_requests;
begin
  select * into r from public.world_join_requests where id = p_request;
  if not found then return 'Anfrage nicht gefunden.'; end if;
  if not public.is_world_admin(r.world_id) then return 'Das dürfen nur Besitzer:in und Admins der Welt.'; end if;
  if r.status <> 'pending' then return 'Die Anfrage ist schon entschieden.'; end if;
  if p_approve then
    insert into public.world_members (world_id, user_id) values (r.world_id, r.user_id) on conflict do nothing;
  end if;
  update public.world_join_requests
    set status = case when p_approve then 'approved' else 'declined' end, decided_by = auth.uid(), decided_at = now()
    where id = p_request;
  return null;
end;
$$;
revoke execute on function public.decide_join_request(uuid, boolean) from public, anon;
grant execute on function public.decide_join_request(uuid, boolean) to authenticated;

-- Admins anschreiben: privater Chat ist auch ohne Freundschaft möglich, solange eine offene Beitrittsanfrage besteht
create or replace function public.start_account_chat(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_chat uuid;
  v_allowed boolean;
begin
  if v_me is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Ungültige Person.';
  end if;
  v_allowed := public.is_friend_of(p_other) or exists (
    select 1 from public.world_join_requests r
    where r.status = 'pending'
      and (
        (r.user_id = v_me and (
          exists (select 1 from public.worlds w where w.id = r.world_id and w.created_by = p_other)
          or exists (select 1 from public.world_members m where m.world_id = r.world_id and m.user_id = p_other and m.role = 'admin')
        ))
        or (r.user_id = p_other and public.is_world_admin(r.world_id))
      )
  );
  if not v_allowed then
    raise exception 'Nur mit Freund:innen möglich.';
  end if;

  select c.id into v_chat
  from public.account_chats c
  where c.kind = 'direct'
    and exists (select 1 from public.account_chat_participants a where a.chat_id = c.id and a.user_id = v_me)
    and exists (select 1 from public.account_chat_participants b where b.chat_id = c.id and b.user_id = p_other)
    and (select count(*) from public.account_chat_participants x where x.chat_id = c.id) = 2
  limit 1;

  if v_chat is null then
    insert into public.account_chats (created_by) values (v_me) returning id into v_chat;
    insert into public.account_chat_participants (chat_id, user_id) values (v_chat, v_me), (v_chat, p_other);
  end if;

  return v_chat;
end;
$$;

-- Übersicht der öffentlichen Welten: jetzt mit Beitrittsart und eigener offener Anfrage
drop function if exists public.public_worlds_overview();
create or replace function public.public_worlds_overview()
returns table (
  id uuid,
  name text,
  description text,
  cover_image_url text,
  is_demo boolean,
  member_count bigint,
  scene_count bigint,
  last_activity timestamptz,
  is_member boolean,
  join_mode text,
  has_request boolean,
  created_by uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id,
    w.name,
    w.description,
    w.cover_image_url,
    w.is_demo,
    (select count(*) from public.world_members m where m.world_id = w.id) as member_count,
    (select count(*) from public.story_posts s where s.world_id = w.id and not s.is_private) as scene_count,
    greatest(
      w.created_at,
      (select max(s.created_at) from public.story_posts s where s.world_id = w.id and not s.is_private),
      (select max(e.created_at) from public.story_entries e join public.story_posts s on s.id = e.story_post_id where s.world_id = w.id and not s.is_private)
    ) as last_activity,
    exists (select 1 from public.world_members m where m.world_id = w.id and m.user_id = auth.uid()) as is_member,
    w.join_mode,
    exists (select 1 from public.world_join_requests r where r.world_id = w.id and r.user_id = auth.uid() and r.status = 'pending') as has_request,
    w.created_by
  from public.worlds w
  where w.is_public or w.is_demo
  order by w.is_demo desc, last_activity desc nulls last;
$$;
revoke execute on function public.public_worlds_overview() from public, anon;
grant execute on function public.public_worlds_overview() to authenticated;

notify pgrst, 'reload schema';
