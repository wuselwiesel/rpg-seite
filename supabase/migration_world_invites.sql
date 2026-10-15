-- Einladungslinks mit Schlüssel: Wer den Link hat, tritt auch einer Welt „Nur auf Einladung“ oder „Auf Anfrage“ direkt bei.
-- Ohne Schlüssel (alter Link nur mit Welt-ID) gilt weiter die Beitrittsart der Welt.
create table if not exists public.world_invites (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists world_invites_world_idx on public.world_invites (world_id) where revoked_at is null;

alter table public.world_invites enable row level security;
drop policy if exists world_invites_admin on public.world_invites;
create policy world_invites_admin on public.world_invites
  for all to authenticated
  using (public.is_world_admin(world_id))
  with check (public.is_world_admin(world_id) and created_by = (select auth.uid()));

-- Ist dieser Schlüssel für diese Welt gültig? (für die Einladungsseite, auch für Nicht-Mitglieder)
create or replace function public.invite_valid(p_world uuid, p_token text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.world_invites i where i.world_id = p_world and i.token = p_token and i.revoked_at is null);
$$;
revoke execute on function public.invite_valid(uuid, text) from public, anon;
grant execute on function public.invite_valid(uuid, text) to authenticated;

-- Mit gültigem Schlüssel Mitglied werden
create or replace function public.join_world_by_invite(p_world uuid, p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then return 'Nicht angemeldet.'; end if;
  if not exists (select 1 from public.world_invites i where i.world_id = p_world and i.token = p_token and i.revoked_at is null) then
    return 'Dieser Einladungslink ist nicht mehr gültig. Bitte die Admins um einen neuen.';
  end if;
  insert into public.world_members (world_id, user_id, role) values (p_world, auth.uid(), 'member') on conflict do nothing;
  -- Eine offene Beitrittsanfrage ist damit erledigt
  update public.world_join_requests set status = 'approved', decided_at = now()
   where world_id = p_world and user_id = auth.uid() and status = 'pending';
  return null;
end;
$$;
revoke execute on function public.join_world_by_invite(uuid, text) from public, anon;
grant execute on function public.join_world_by_invite(uuid, text) to authenticated;

notify pgrst, 'reload schema';
