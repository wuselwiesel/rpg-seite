-- Auch Hauptcharaktere lassen sich vergeben (nicht nur NPCs): Die Besitzer:in gibt ihren Charakter frei oder bietet ihn an,
-- der Charakter bleibt ein normaler Charakter und wechselt samt Geschichte das Konto. Entscheiden dürfen Admins und die Besitzer:in.

-- Anfragen und Angebote sieht auch die Besitzer:in des Charakters
drop policy if exists character_claims_select on public.character_claims;
create policy character_claims_select on public.character_claims
  for select to authenticated using (
    user_id = (select auth.uid())
    or public.is_world_admin(world_id)
    or exists (select 1 from public.characters c where c.id = character_claims.character_id and c.owner_id = (select auth.uid()))
  );

-- Vorschau: freigegebene Rollen, NPC oder Hauptcharakter
create or replace function public.world_preview_roles(p_world uuid)
returns table (id uuid, name text, avatar_url text, bio text, species text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.name, c.avatar_url, c.bio,
         coalesce(
           nullif((select c.choices ->> l.id::text from public.world_choice_lists l where l.world_id = c.world_id and l.is_species limit 1), ''),
           case c.species when 'vampir' then 'Vampir' when 'werwolf' then 'Werwolf' when 'mensch' then 'Mensch' else null end
         )
  from public.characters c join public.worlds w on w.id = c.world_id
  where c.world_id = p_world and w.preview <> 'none' and c.deleted_at is null and c.claimable
  order by c.name
  limit 100;
$$;

-- Rolle anfragen: jeder freigegebene Charakter (nicht der eigene)
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
  if not found or c.deleted_at is not null or not c.claimable then
    raise exception 'Diese Rolle ist nicht zu vergeben.';
  end if;
  if c.owner_id = auth.uid() then
    raise exception 'Das ist schon dein Charakter.';
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
  return jsonb_build_object('id', v_id, 'world_id', c.world_id, 'character_name', c.name, 'owner_id', c.owner_id, 'is_npc', c.is_npc);
exception when unique_violation then
  raise exception 'Du hast diese Rolle schon angefragt.';
end;
$$;

-- Anbieten: Admins (NPCs und Hauptcharaktere) und die Besitzer:in des Charakters
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
  select id, world_id, name, owner_id, is_npc, deleted_at into c from public.characters where id = p_character;
  if not found or c.deleted_at is not null then
    raise exception 'Diesen Charakter gibt es nicht.';
  end if;
  if not (c.owner_id = auth.uid() or (c.is_npc and public.is_world_admin(c.world_id))) then
    raise exception 'Das dürfen nur die Besitzer:in des Charakters und bei NPCs die Admins der Welt.' using errcode = '42501';
  end if;
  if p_user = c.owner_id then
    raise exception 'Der Charakter gehört dieser Person schon.';
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

-- Entscheiden: Anfragen die Admins oder die Besitzer:in, Angebote die angebotene Person
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
  select id, name, owner_id, is_npc, claimable, deleted_at into c from public.characters where id = k.character_id;
  if k.kind = 'request' then
    if not (public.is_world_admin(k.world_id) and c.is_npc) and c.owner_id is distinct from auth.uid() then
      raise exception 'Das dürfen nur die Besitzer:in des Charakters und bei NPCs die Admins der Welt.' using errcode = '42501';
    end if;
  else
    if k.user_id <> auth.uid() then
      raise exception 'Dieses Angebot gilt einer anderen Person.' using errcode = '42501';
    end if;
  end if;
  if p_approve then
    if not found or c.deleted_at is not null then
      raise exception 'Diese Rolle gibt es nicht mehr.';
    end if;
    if k.kind = 'request' and not (c.is_npc or c.claimable) then
      raise exception 'Diese Rolle ist nicht mehr frei.';
    end if;
    if k.kind = 'offer' and not c.is_npc and c.owner_id is distinct from k.created_by then
      raise exception 'Dieses Angebot ist nicht mehr gültig.';
    end if;
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

-- Zurückziehen: die anfragende Person ihre Anfrage; Angebote die Person, die sie gemacht hat, die Besitzer:in oder die Admins
create or replace function public.withdraw_character_claim(p_claim uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k record;
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select * into k from public.character_claims where id = p_claim for update;
  if not found or k.status <> 'pending' then
    raise exception 'Das ist schon erledigt.';
  end if;
  select owner_id into v_owner from public.characters where id = k.character_id;
  if not (
    (k.kind = 'request' and k.user_id = auth.uid())
    or (k.kind = 'offer' and (k.created_by = auth.uid() or v_owner = auth.uid() or public.is_world_admin(k.world_id)))
  ) then
    raise exception 'Das darfst du nicht.' using errcode = '42501';
  end if;
  update public.character_claims set status = 'withdrawn', decided_by = auth.uid(), decided_at = now() where id = k.id;
end;
$$;

-- Beitrittsantrag mit gewünschter Rolle: auch Hauptcharaktere; wer entscheidet, bleibt der Admin (er kann sie nur bei NPCs sofort geben)
create or replace function public.resolve_requested_role(p_request uuid, p_give boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  c record;
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  select * into r from public.world_join_requests where id = p_request;
  if not found or r.status <> 'approved' or r.character_id is null then
    return null;
  end if;
  if not public.is_world_admin(r.world_id) then
    raise exception 'Das dürfen nur Admins der Welt.' using errcode = '42501';
  end if;
  select id, name, owner_id, is_npc, claimable, deleted_at into c from public.characters where id = r.character_id and world_id = r.world_id;
  if not found or c.deleted_at is not null or not c.claimable then
    return null;
  end if;
  if p_give and c.is_npc then
    perform public._transfer_character(c.id, r.user_id, auth.uid());
  else
    -- Hauptcharaktere gibt nur ihre Besitzer:in her: die Anfrage wird für sie vorgemerkt
    insert into public.character_claims (world_id, character_id, user_id, kind, message, created_by)
    values (r.world_id, c.id, r.user_id, 'request', left(coalesce(r.message, ''), 500), r.user_id)
    on conflict do nothing;
  end if;
  return jsonb_build_object('character_id', c.id, 'character_name', c.name, 'user_id', r.user_id, 'world_id', r.world_id, 'given', p_give and c.is_npc);
end;
$$;

notify pgrst, 'reload schema';
