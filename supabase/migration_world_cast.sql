-- Besetzung: Liste der Rollen einer Welt (zum Beispiel Figuren einer Serie), mit Anfragen, Reservierung und Verknüpfung zu Charakteren.

alter table public.worlds add column if not exists cast_enabled boolean not null default false;

create table if not exists public.world_roles (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  age_text text check (age_text is null or char_length(age_text) <= 60),
  species_text text check (species_text is null or char_length(species_text) <= 120),
  source text check (source is null or char_length(source) <= 60),
  description text check (description is null or char_length(description) <= 2000),
  deceased boolean not null default false,
  -- open = kann besetzt werden, npc = wird nicht besetzt
  state text not null default 'open' check (state in ('open', 'npc')),
  -- Reservierung (mit Frist) oder Zusage (ohne Frist): für ein Mitglied oder einen frei eingetragenen Namen
  holder_user uuid references public.profiles (id) on delete set null,
  holder_label text check (holder_label is null or char_length(holder_label) <= 80),
  holder_kind text check (holder_kind in ('reserved', 'approved')),
  holder_until timestamptz,
  character_id uuid references public.characters (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists world_roles_world_idx on public.world_roles (world_id);
create index if not exists world_roles_character_idx on public.world_roles (character_id) where character_id is not null;

create table if not exists public.world_role_requests (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.world_roles (id) on delete cascade,
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists world_role_requests_one_pending on public.world_role_requests (role_id, user_id) where status = 'pending';
create index if not exists world_role_requests_world_idx on public.world_role_requests (world_id, status);

alter table public.world_roles enable row level security;
alter table public.world_role_requests enable row level security;

-- Mitglieder lesen die Besetzung; schreiben dürfen Besitzer:in und Admins der Welt
drop policy if exists world_roles_select on public.world_roles;
create policy world_roles_select on public.world_roles
  for select to authenticated using (public.is_world_member(world_id) or public.is_app_admin());

drop policy if exists world_roles_admin_write on public.world_roles;
create policy world_roles_admin_write on public.world_roles
  for all to authenticated
  using (public.is_world_admin(world_id))
  with check (public.is_world_admin(world_id));

-- Anfragen sieht, wer sie gestellt hat, und die Admins; geändert wird nur über die Funktionen unten
drop policy if exists world_role_requests_select on public.world_role_requests;
create policy world_role_requests_select on public.world_role_requests
  for select to authenticated using (user_id = (select auth.uid()) or public.is_world_admin(world_id));

-- Ist die Rolle gerade vergeben, reserviert oder gesperrt?
create or replace function public._role_is_available(r public.world_roles)
returns boolean
language sql
stable
as $$
  select r.state = 'open'
     and (r.character_id is null or exists (select 1 from public.characters c where c.id = r.character_id and (c.deleted_at is not null or c.vacant)))
     and (r.holder_kind is null or (r.holder_kind = 'reserved' and r.holder_until is not null and r.holder_until <= now()));
$$;

-- Mitglied fragt eine Rolle an
create or replace function public.request_role(p_role uuid, p_message text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.world_roles;
  w public.worlds;
begin
  select * into r from public.world_roles where id = p_role;
  if not found then raise exception 'Diese Rolle gibt es nicht mehr.'; end if;
  select * into w from public.worlds where id = r.world_id;
  if not coalesce(w.cast_enabled, false) then raise exception 'Die Besetzung ist in dieser Welt nicht eingeschaltet.'; end if;
  if auth.uid() is null or not public.is_world_member(r.world_id) then raise exception 'Nur Mitglieder der Welt können Rollen anfragen.'; end if;
  if not public._role_is_available(r) then raise exception 'Diese Rolle ist gerade nicht frei.'; end if;
  insert into public.world_role_requests (role_id, world_id, user_id, message)
  values (r.id, r.world_id, auth.uid(), nullif(left(trim(coalesce(p_message, '')), 500), ''));
  return jsonb_build_object('world_id', r.world_id, 'role_name', r.name);
exception when unique_violation then
  raise exception 'Du hast diese Rolle schon angefragt.';
end;
$$;

create or replace function public.withdraw_role_request(p_request uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.world_role_requests set status = 'withdrawn', decided_at = now()
  where id = p_request and user_id = auth.uid() and status = 'pending';
$$;

-- Admin: Anfrage zusagen oder ablehnen. Zusage = die Person darf den Charakter zur Rolle anlegen.
create or replace function public.decide_role_request(p_request uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.world_role_requests;
  r public.world_roles;
begin
  select * into q from public.world_role_requests where id = p_request for update;
  if not found or q.status <> 'pending' then raise exception 'Diese Anfrage ist schon entschieden.'; end if;
  if auth.uid() is null or not public.is_world_admin(q.world_id) then raise exception 'Das dürfen nur Admins der Welt.'; end if;
  select * into r from public.world_roles where id = q.role_id for update;
  if p_approve then
    if not public._role_is_available(r) and not (r.holder_kind = 'reserved' and r.holder_user = q.user_id) then
      raise exception 'Die Rolle ist inzwischen nicht mehr frei.';
    end if;
    update public.world_roles
       set holder_user = q.user_id, holder_label = null, holder_kind = 'approved', holder_until = null,
           character_id = case when character_id is not null and exists (select 1 from public.characters c where c.id = character_id and (c.deleted_at is not null or c.vacant)) then null else character_id end
     where id = r.id;
    update public.world_role_requests set status = 'approved', decided_by = auth.uid(), decided_at = now() where id = q.id;
    update public.world_role_requests set status = 'declined', decided_by = auth.uid(), decided_at = now()
     where role_id = r.id and status = 'pending' and id <> q.id;
  else
    update public.world_role_requests set status = 'declined', decided_by = auth.uid(), decided_at = now() where id = q.id;
  end if;
  return jsonb_build_object('world_id', q.world_id, 'role_id', r.id, 'role_name', r.name, 'user_id', q.user_id, 'approved', p_approve);
end;
$$;

-- Admin: reservieren (für ein Mitglied oder einen frei eingetragenen Namen, mit Frist) oder Reservierung/Zusage aufheben
create or replace function public.set_role_holder(p_role uuid, p_user uuid, p_label text, p_until timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.world_roles;
begin
  select * into r from public.world_roles where id = p_role for update;
  if not found then raise exception 'Diese Rolle gibt es nicht mehr.'; end if;
  if auth.uid() is null or not public.is_world_admin(r.world_id) then raise exception 'Das dürfen nur Admins der Welt.'; end if;
  if p_user is null and coalesce(trim(p_label), '') = '' then
    update public.world_roles set holder_user = null, holder_label = null, holder_kind = null, holder_until = null where id = r.id;
  else
    if p_user is not null and not exists (select 1 from public.world_members wm where wm.world_id = r.world_id and wm.user_id = p_user) then
      raise exception 'Die Person ist kein Mitglied dieser Welt.';
    end if;
    update public.world_roles
       set holder_user = p_user, holder_label = case when p_user is null then left(trim(p_label), 80) else null end,
           holder_kind = 'reserved', holder_until = p_until
     where id = r.id;
  end if;
end;
$$;

-- Charakter mit Rolle verbinden: Admins beliebig, die zugesagte Person nur mit ihrem eigenen Charakter
create or replace function public.link_role_character(p_role uuid, p_character uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.world_roles;
  c public.characters;
  admin boolean;
begin
  select * into r from public.world_roles where id = p_role for update;
  if not found then raise exception 'Diese Rolle gibt es nicht mehr.'; end if;
  admin := auth.uid() is not null and public.is_world_admin(r.world_id);
  if p_character is null then
    if not admin then raise exception 'Das dürfen nur Admins der Welt.'; end if;
    update public.world_roles set character_id = null where id = r.id;
    return;
  end if;
  select * into c from public.characters where id = p_character;
  if not found or c.world_id <> r.world_id or c.deleted_at is not null then raise exception 'Diesen Charakter gibt es in der Welt nicht.'; end if;
  if not admin then
    if not (r.holder_kind = 'approved' and r.holder_user = auth.uid() and c.owner_id = auth.uid()) then
      raise exception 'Du hast für diese Rolle keine Zusage.';
    end if;
  end if;
  update public.world_roles
     set character_id = c.id, holder_user = null, holder_label = null, holder_kind = null, holder_until = null
   where id = r.id;
end;
$$;

-- Wird ein Charakter gelöscht, ist seine Rolle wieder frei
create or replace function public._role_release_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.world_roles set character_id = null where character_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists characters_role_release_trg on public.characters;
create trigger characters_role_release_trg after update of deleted_at on public.characters
  for each row execute function public._role_release_on_delete();

revoke all on function public.request_role(uuid, text) from public, anon;
revoke all on function public.withdraw_role_request(uuid) from public, anon;
revoke all on function public.decide_role_request(uuid, boolean) from public, anon;
revoke all on function public.set_role_holder(uuid, uuid, text, timestamptz) from public, anon;
revoke all on function public.link_role_character(uuid, uuid) from public, anon;
grant execute on function public.request_role(uuid, text) to authenticated;
grant execute on function public.withdraw_role_request(uuid) to authenticated;
grant execute on function public.decide_role_request(uuid, boolean) to authenticated;
grant execute on function public.set_role_holder(uuid, uuid, text, timestamptz) to authenticated;
grant execute on function public.link_role_character(uuid, uuid) to authenticated;

-- Vorschau für Besucher:innen: Rollen mit Stand, ohne Spieler:innen-Namen (nur wenn die Welt „Erkunden“ erlaubt und die Besetzung an ist)
create or replace function public.world_preview_cast(p_world uuid)
returns table(id uuid, name text, age_text text, species_text text, source text, description text, deceased boolean, status text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.name, r.age_text, r.species_text, r.source, r.description, r.deceased,
         case when r.state = 'npc' then 'npc'
              when public._role_is_available(r) and r.holder_kind is null then 'free'
              when public._role_is_available(r) then 'free'
              when r.character_id is not null then 'taken'
              else 'reserved' end
  from public.world_roles r join public.worlds w on w.id = r.world_id
  where r.world_id = p_world and w.preview <> 'none' and w.cast_enabled
  order by r.name
  limit 1000;
$$;
revoke all on function public.world_preview_cast(uuid) from public, anon;
grant execute on function public.world_preview_cast(uuid) to authenticated;

notify pgrst, 'reload schema';
