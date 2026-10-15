-- Rollen zu vergeben: Admins legen NPCs an und geben sie zur Vergabe frei. Mitglieder fragen sie an (ein Admin entscheidet),
-- oder ein Admin bietet sie einer Person an (die Person nimmt an). Bei der Übergabe wechselt der Charakter samt Geschichte auf das
-- Konto der neuen Besitzer:in. Zurückgeben macht ihn wieder zu einer freien Rolle der Welt-Besitzerin.

alter table public.characters add column if not exists claimable boolean not null default false;

-- Anfragen (Mitglied → Admins) und Angebote (Admin → Mitglied)
create table if not exists public.character_claims (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  -- anfragende bzw. angebotene Person
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('request', 'offer')),
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  created_by uuid references public.profiles (id) on delete set null,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists character_claims_pending_idx on public.character_claims (character_id, user_id) where status = 'pending';
create index if not exists character_claims_world_idx on public.character_claims (world_id, status);
create index if not exists character_claims_user_idx on public.character_claims (user_id, status);

alter table public.character_claims enable row level security;
drop policy if exists character_claims_select on public.character_claims;
create policy character_claims_select on public.character_claims
  for select to authenticated using (user_id = (select auth.uid()) or public.is_world_admin(world_id));
-- Schreiben nur über die Funktionen unten

-- Protokoll der Übergaben
create table if not exists public.character_transfers (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  from_user uuid references public.profiles (id) on delete set null,
  to_user uuid references public.profiles (id) on delete set null,
  by_user uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists character_transfers_char_idx on public.character_transfers (character_id, created_at desc);
alter table public.character_transfers enable row level security;
drop policy if exists character_transfers_select on public.character_transfers;
create policy character_transfers_select on public.character_transfers
  for select to authenticated using (
    public.is_world_admin(world_id) or from_user = (select auth.uid()) or to_user = (select auth.uid())
  );

-- Die Sperre „Besitz ändert nur die Besitzer:in“ gilt weiter; die Übergabe-Funktionen setzen ein Zeichen, das nur innerhalb ihrer Transaktion gilt.
create or replace function public.characters_npc_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.character_transfer', true), '') = '1' then
    return new;
  end if;
  if auth.uid() is not null and old.owner_id <> auth.uid() then
    if new.is_npc is distinct from old.is_npc then
      raise exception 'Nur die Person, die den Charakter angelegt hat, kann ihn zum NPC machen oder zurückverwandeln.';
    end if;
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Die Besitzer:in eines Charakters kann nur sie selbst ändern.';
    end if;
  end if;
  return new;
end $$;

-- Alle Admins (nicht nur die Besitzer:in der Welt) dürfen NPCs und freie Rollen bearbeiten, löschen und ihren Bogen pflegen
alter policy "characters_update_world_owner_npc" on public.characters
  using (is_npc and public.is_world_admin(world_id)) with check (is_npc and public.is_world_admin(world_id));
alter policy "characters_delete_world_owner_npc" on public.characters
  using (is_npc and public.is_world_admin(world_id));
alter policy "character_sheets_insert_world_owner_npc" on public.character_sheets
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_admin(c.world_id)));
alter policy "character_sheets_update_world_owner_npc" on public.character_sheets
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_admin(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_admin(c.world_id)));
alter policy "character_sheets_delete_world_owner_npc" on public.character_sheets
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_select_world_owner_npc" on public.character_sheet_secrets
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_insert_world_owner_npc" on public.character_sheet_secrets
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_update_world_owner_npc" on public.character_sheet_secrets
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_admin(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_delete_world_owner_npc" on public.character_sheet_secrets
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_admin(c.world_id)));
alter policy "character_sheet_log_insert_world_owner_npc" on public.character_sheet_log
  with check (actor_id = auth.uid() and exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and c.is_npc and public.is_world_admin(c.world_id)));

-- Übergabe (nur intern): Besitz wechseln, kein NPC mehr, nicht mehr zu vergeben, andere offene Anfragen erledigen, protokollieren
create or replace function public._transfer_character(p_char uuid, p_to uuid, p_by uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
begin
  select id, world_id, owner_id, deleted_at into c from public.characters where id = p_char for update;
  if not found or c.deleted_at is not null then
    raise exception 'Diesen Charakter gibt es nicht mehr.';
  end if;
  if not exists (select 1 from public.world_members wm where wm.world_id = c.world_id and wm.user_id = p_to) then
    raise exception 'Die Person ist kein Mitglied dieser Welt.';
  end if;
  perform set_config('app.character_transfer', '1', true);
  update public.characters set owner_id = p_to, is_npc = false, claimable = false where id = p_char;
  perform set_config('app.character_transfer', '', true);
  update public.character_claims
     set status = 'declined', decided_by = p_by, decided_at = now()
   where character_id = p_char and status = 'pending';
  insert into public.character_transfers (world_id, character_id, from_user, to_user, by_user)
  values (c.world_id, p_char, c.owner_id, p_to, p_by);
end;
$$;
revoke all on function public._transfer_character(uuid, uuid, uuid) from public, anon, authenticated;

-- Rolle anfragen (Mitglied)
create or replace function public.request_character(p_character uuid, p_message text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select id, world_id, name, owner_id, is_npc, claimable, deleted_at into c from public.characters where id = p_character;
  if not found or c.deleted_at is not null or not c.is_npc or not c.claimable then
    raise exception 'Diese Rolle ist nicht zu vergeben.';
  end if;
  if not public.is_world_member(c.world_id) then
    raise exception 'Du musst Mitglied der Welt sein.';
  end if;
  if (select count(*) from public.character_claims x where x.world_id = c.world_id and x.user_id = auth.uid() and x.kind = 'request' and x.status = 'pending') >= 3 then
    raise exception 'Du hast schon drei offene Anfragen. Warte auf eine Antwort oder ziehe eine zurück.';
  end if;
  insert into public.character_claims (world_id, character_id, user_id, kind, message, created_by)
  values (c.world_id, c.id, auth.uid(), 'request', left(coalesce(p_message, ''), 500), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'world_id', c.world_id, 'character_name', c.name);
exception when unique_violation then
  raise exception 'Du hast diese Rolle schon angefragt.';
end;
$$;

-- Rolle einer Person anbieten (Admin)
create or replace function public.offer_character(p_character uuid, p_user uuid, p_message text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select id, world_id, name, is_npc, deleted_at into c from public.characters where id = p_character;
  if not found or c.deleted_at is not null or not c.is_npc then
    raise exception 'Nur NPCs lassen sich anbieten.';
  end if;
  if not public.is_world_admin(c.world_id) then
    raise exception 'Das dürfen nur Admins der Welt.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.world_members wm where wm.world_id = c.world_id and wm.user_id = p_user) then
    raise exception 'Die Person ist kein Mitglied dieser Welt.';
  end if;
  if exists (select 1 from public.character_claims x where x.character_id = c.id and x.kind = 'offer' and x.status = 'pending') then
    raise exception 'Diese Rolle ist schon jemandem angeboten. Ziehe das Angebot zurück, um sie jemand anderem anzubieten.';
  end if;
  insert into public.character_claims (world_id, character_id, user_id, kind, message, created_by)
  values (c.world_id, c.id, p_user, 'offer', left(coalesce(p_message, ''), 500), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'world_id', c.world_id, 'character_name', c.name, 'user_id', p_user);
exception when unique_violation then
  raise exception 'Dieser Person ist die Rolle schon angeboten.';
end;
$$;

-- Anfrage entscheiden (Admin) bzw. Angebot annehmen oder ablehnen (angebotene Person)
create or replace function public.decide_character_claim(p_claim uuid, p_approve boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k record;
  c record;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select * into k from public.character_claims where id = p_claim for update;
  if not found or k.status <> 'pending' then
    raise exception 'Diese Anfrage ist schon erledigt.';
  end if;
  if k.kind = 'request' then
    if not public.is_world_admin(k.world_id) then
      raise exception 'Das dürfen nur Admins der Welt.' using errcode = '42501';
    end if;
  else
    if k.user_id <> auth.uid() then
      raise exception 'Dieses Angebot gilt einer anderen Person.' using errcode = '42501';
    end if;
  end if;
  select id, name, is_npc, deleted_at into c from public.characters where id = k.character_id;
  if p_approve and (not found or c.deleted_at is not null or not c.is_npc) then
    raise exception 'Diese Rolle ist nicht mehr frei.';
  end if;
  update public.character_claims
     set status = case when p_approve then 'approved' else 'declined' end, decided_by = auth.uid(), decided_at = now()
   where id = k.id;
  if p_approve then
    perform public._transfer_character(k.character_id, k.user_id, auth.uid());
  end if;
  return jsonb_build_object(
    'kind', k.kind, 'approved', p_approve, 'world_id', k.world_id, 'character_id', k.character_id,
    'character_name', c.name, 'user_id', k.user_id, 'created_by', k.created_by
  );
end;
$$;

-- Zurückziehen: die anfragende Person ihre Anfrage, ein Admin ein Angebot
create or replace function public.withdraw_character_claim(p_claim uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k record;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select * into k from public.character_claims where id = p_claim for update;
  if not found or k.status <> 'pending' then
    raise exception 'Das ist schon erledigt.';
  end if;
  if not ((k.kind = 'request' and k.user_id = auth.uid()) or (k.kind = 'offer' and public.is_world_admin(k.world_id))) then
    raise exception 'Das darfst du nicht.' using errcode = '42501';
  end if;
  update public.character_claims set status = 'withdrawn', decided_by = auth.uid(), decided_at = now() where id = k.id;
end;
$$;

-- Charakter an die Welt zurückgeben: wird wieder eine freie Rolle der Welt-Besitzerin
create or replace function public.release_character(p_character uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  w record;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select id, world_id, name, owner_id, is_npc, deleted_at into c from public.characters where id = p_character for update;
  if not found or c.deleted_at is not null then raise exception 'Diesen Charakter gibt es nicht.'; end if;
  if c.owner_id <> auth.uid() then raise exception 'Das ist nicht dein Charakter.' using errcode = '42501'; end if;
  select created_by into w from public.worlds where id = c.world_id;
  if w.created_by = auth.uid() then
    raise exception 'Als Besitzer:in der Welt machst du den Charakter einfach zum NPC.';
  end if;
  perform set_config('app.character_transfer', '1', true);
  update public.characters set owner_id = w.created_by, is_npc = true, claimable = true where id = p_character;
  perform set_config('app.character_transfer', '', true);
  insert into public.character_transfers (world_id, character_id, from_user, to_user, by_user)
  values (c.world_id, p_character, auth.uid(), w.created_by, auth.uid());
  return jsonb_build_object('world_id', c.world_id, 'character_name', c.name);
end;
$$;

revoke all on function public.request_character(uuid, text) from public, anon;
revoke all on function public.offer_character(uuid, uuid, text) from public, anon;
revoke all on function public.decide_character_claim(uuid, boolean) from public, anon;
revoke all on function public.withdraw_character_claim(uuid) from public, anon;
revoke all on function public.release_character(uuid) from public, anon;
grant execute on function public.request_character(uuid, text) to authenticated;
grant execute on function public.offer_character(uuid, uuid, text) to authenticated;
grant execute on function public.decide_character_claim(uuid, boolean) to authenticated;
grant execute on function public.withdraw_character_claim(uuid) to authenticated;
grant execute on function public.release_character(uuid) to authenticated;

notify pgrst, 'reload schema';
