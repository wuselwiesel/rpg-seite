-- „Frei“ ist kein NPC: Ein Charakter kann ohne Spieler:in angelegt werden (vacant), um ihn später anzubieten.
-- Er bleibt ein normaler Charakter (is_npc = false), gehört bis zur Übergabe der Person, die ihn angelegt hat, und
-- zählt nicht zu deren spielbaren Charakteren.
alter table public.characters add column if not exists vacant boolean not null default false;
create index if not exists characters_vacant_idx on public.characters (world_id) where vacant;

-- Admins dürfen NPCs und freie Charaktere bearbeiten und pflegen
alter policy "characters_update_world_owner_npc" on public.characters
  using ((is_npc or vacant) and public.is_world_admin(world_id)) with check ((is_npc or vacant) and public.is_world_admin(world_id));
alter policy "characters_delete_world_owner_npc" on public.characters
  using ((is_npc or vacant) and public.is_world_admin(world_id));
alter policy "character_sheets_insert_world_owner_npc" on public.character_sheets
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));
alter policy "character_sheets_update_world_owner_npc" on public.character_sheets
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));
alter policy "character_sheets_delete_world_owner_npc" on public.character_sheets
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_select_world_owner_npc" on public.character_sheet_secrets
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_insert_world_owner_npc" on public.character_sheet_secrets
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_update_world_owner_npc" on public.character_sheet_secrets
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));
alter policy "character_sheet_secrets_delete_world_owner_npc" on public.character_sheet_secrets
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));
alter policy "character_sheet_log_insert_world_owner_npc" on public.character_sheet_log
  with check (actor_id = auth.uid() and exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and (c.is_npc or c.vacant) and public.is_world_admin(c.world_id)));

-- Übergabe: kein freier Charakter mehr
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
  update public.characters set owner_id = p_to, is_npc = false, claimable = false, vacant = false where id = p_char;
  perform set_config('app.character_transfer', '', true);
  update public.character_claims
     set status = 'declined', decided_by = p_by, decided_at = now()
   where character_id = p_char and status = 'pending';
  insert into public.character_transfers (world_id, character_id, from_user, to_user, by_user)
  values (c.world_id, p_char, c.owner_id, p_to, p_by);
end;
$$;
revoke all on function public._transfer_character(uuid, uuid, uuid) from public, anon, authenticated;

-- Anfrage: Rückgabe zeigt, ob Admins oder die Besitzer:in entscheiden (NPC oder frei = Admins)
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
  select id, world_id, name, owner_id, is_npc, vacant, claimable, deleted_at into c from public.characters where id = p_character;
  if not found or c.deleted_at is not null or not c.claimable then
    raise exception 'Diese Rolle ist nicht zu vergeben.';
  end if;
  if c.owner_id = auth.uid() and not c.vacant then
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
  return jsonb_build_object('id', v_id, 'world_id', c.world_id, 'character_name', c.name, 'owner_id', c.owner_id, 'is_npc', c.is_npc or c.vacant);
exception when unique_violation then
  raise exception 'Du hast diese Rolle schon angefragt.';
end;
$$;

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
  select id, world_id, name, owner_id, is_npc, vacant, deleted_at into c from public.characters where id = p_character;
  if not found or c.deleted_at is not null then
    raise exception 'Diesen Charakter gibt es nicht.';
  end if;
  if not (c.owner_id = auth.uid() or ((c.is_npc or c.vacant) and public.is_world_admin(c.world_id))) then
    raise exception 'Das dürfen nur die Besitzer:in des Charakters und bei NPCs und freien Charakteren die Admins der Welt.' using errcode = '42501';
  end if;
  if p_user = c.owner_id and not c.vacant then
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
  select id, name, owner_id, is_npc, vacant, claimable, deleted_at into c from public.characters where id = k.character_id;
  if k.kind = 'request' then
    if not (public.is_world_admin(k.world_id) and (c.is_npc or c.vacant)) and c.owner_id is distinct from auth.uid() then
      raise exception 'Das dürfen nur die Besitzer:in des Charakters und bei NPCs und freien Charakteren die Admins der Welt.' using errcode = '42501';
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
    if k.kind = 'request' and not (c.is_npc or c.vacant or c.claimable) then
      raise exception 'Diese Rolle ist nicht mehr frei.';
    end if;
    if k.kind = 'offer' and not (c.is_npc or c.vacant) and c.owner_id is distinct from k.created_by then
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

-- Zurückgeben: wird ein freier Charakter der Welt-Besitzerin (kein NPC)
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
  select id, world_id, name, owner_id, deleted_at into c from public.characters where id = p_character for update;
  if not found or c.deleted_at is not null then raise exception 'Diesen Charakter gibt es nicht.'; end if;
  if c.owner_id <> auth.uid() then raise exception 'Das ist nicht dein Charakter.' using errcode = '42501'; end if;
  select created_by into w from public.worlds where id = c.world_id;
  if w.created_by = auth.uid() then
    raise exception 'Als Besitzer:in der Welt gibst du den Charakter über „Zur Vergabe freigeben“ frei.';
  end if;
  perform set_config('app.character_transfer', '1', true);
  update public.characters set owner_id = w.created_by, is_npc = false, vacant = true, claimable = true where id = p_character;
  perform set_config('app.character_transfer', '', true);
  insert into public.character_transfers (world_id, character_id, from_user, to_user, by_user)
  values (c.world_id, p_character, auth.uid(), w.created_by, auth.uid());
  return jsonb_build_object('world_id', c.world_id, 'character_name', c.name);
end;
$$;

notify pgrst, 'reload schema';

-- Übersicht: freie Charaktere zählen nicht als Spieler-Charaktere der Mitglieder
create or replace function public.world_overview(p_world uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not (public.is_world_admin(p_world) or public.is_app_admin()) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;

  with
  w as (select * from public.worlds where id = p_world),
  chars as (
    select c.id, c.owner_id, c.name, c.avatar_url, c.choices, coalesce(c.is_npc, false) as is_npc, coalesce(c.vacant, false) as vacant
    from public.characters c where c.world_id = p_world and c.deleted_at is null
  ),
  writes as (
    select c.owner_id, c.id as character_id, x.created_at, 'post' as kind
      from chars c join public.posts x on x.character_id = c.id
    union all
    select c.owner_id, c.id, e.created_at, 'entry'
      from chars c join public.story_entries e on e.character_id = c.id
    union all
    select c.owner_id, c.id, m.created_at, 'message'
      from chars c join public.messages m on m.character_id = c.id
  ),
  mem as (
    select wm.user_id, wm.joined_at,
           case when wm.user_id = (select created_by from w) then 'owner' else wm.role end as role,
           p.username, p.nickname
    from public.world_members wm join public.profiles p on p.id = wm.user_id
    where wm.world_id = p_world
  )
  select jsonb_build_object(
    'members', jsonb_build_object(
      'total', (select count(*) from mem),
      'admins', (select count(*) from mem where role in ('owner', 'admin')),
      'new_7d', (select count(*) from mem where joined_at > now() - interval '7 days'),
      'new_30d', (select count(*) from mem where joined_at > now() - interval '30 days'),
      'pending_requests', (select count(*) from public.world_join_requests r where r.world_id = p_world and r.status = 'pending'),
      'list', (
        select coalesce(jsonb_agg(row_to_json(t) order by t.joined_at), '[]'::jsonb) from (
          select m.user_id, m.username, m.nickname, m.role, m.joined_at,
                 (select count(*) from chars c where c.owner_id = m.user_id and not c.is_npc and not c.vacant) as characters,
                 (select count(*) from chars c where c.owner_id = m.user_id and c.is_npc) as npcs,
                 (select c.id from chars c where c.owner_id = m.user_id and not c.is_npc and not c.vacant order by c.name limit 1) as character_id,
                 (select c.avatar_url from chars c where c.owner_id = m.user_id and not c.is_npc and not c.vacant order by c.name limit 1) as avatar_url,
                 (select max(x.created_at) from writes x where x.owner_id = m.user_id) as last_written_at
          from mem m
        ) t
      )
    ),
    'characters', jsonb_build_object(
      'total', (select count(*) from chars where not is_npc and not vacant),
      'vacant', (select count(*) from chars where vacant),
      'npcs', (select count(*) from chars where is_npc),
      'lists', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', l.id, 'label', l.label, 'is_species', l.is_species, 'mode', l.mode,
          'options', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'label', o.label, 'max_count', o.max_count,
              'used', (select count(*) from chars c where c.choices ->> l.id::text = o.label)
            ) order by o.sort_order, o.label), '[]'::jsonb)
            from public.world_choice_options o where o.list_id = l.id
          )
        ) order by l.is_species desc, l.sort_order, l.label), '[]'::jsonb)
        from public.world_choice_lists l where l.world_id = p_world
      )
    ),
    'activity', jsonb_build_object(
      'posts_7d', (select count(*) from writes where kind = 'post' and created_at > now() - interval '7 days'),
      'scene_entries_7d', (select count(*) from writes where kind = 'entry' and created_at > now() - interval '7 days'),
      'messages_7d', (select count(*) from writes where kind = 'message' and created_at > now() - interval '7 days'),
      'scenes_active', (select count(*) from public.story_posts s where s.world_id = p_world and not s.archived),
      'scenes_archived', (select count(*) from public.story_posts s where s.world_id = p_world and s.archived),
      'top_writers', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select c.name, count(*) as n
          from writes x join chars c on c.id = x.character_id
          where x.created_at > now() - interval '7 days' and not c.is_npc
          group by c.id, c.name order by count(*) desc, c.name limit 5
        ) t
      )
    ),
    'content', jsonb_build_object(
      'wiki_pages', (select count(*) from public.wiki_pages p where p.world_id = p_world),
      'arcs', (select count(*) from public.story_arcs a where a.world_id = p_world),
      'relationships', (select count(*) from public.character_relationships r where r.world_id = p_world),
      'secret_entries', (
        select coalesce(sum(
          coalesce(jsonb_array_length(case when jsonb_typeof(s.data -> 'personalFields') = 'array' then s.data -> 'personalFields' end), 0)
          + coalesce(jsonb_array_length(case when jsonb_typeof(s.data -> 'family') = 'array' then s.data -> 'family' end), 0)
          + coalesce(jsonb_array_length(case when jsonb_typeof(s.data -> 'notesBlocks') = 'array' then s.data -> 'notesBlocks' end), 0)
        ), 0)
        from public.character_sheet_secrets s join chars c on c.id = s.character_id
      ) + (select count(*) from public.character_relationships r where r.world_id = p_world and r.is_secret)
    )
  ) into v;

  return v;
end;
$$;

revoke all on function public.world_overview(uuid) from public, anon;
grant execute on function public.world_overview(uuid) to authenticated;

notify pgrst, 'reload schema';
