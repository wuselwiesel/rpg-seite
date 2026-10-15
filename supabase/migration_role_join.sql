-- Rollen schon vor dem Beitritt: freie Rollen in der Vorschau zeigen und sie beim Beitrittsantrag gleich mitanfragen.

-- Gewünschte Rolle eines Beitrittsantrags
alter table public.world_join_requests add column if not exists character_id uuid references public.characters (id) on delete set null;

-- Freie Rollen für die Vorschau (gleiche Freigabe wie die Figuren: Einstellung „Erkunden“ der Welt)
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
  where c.world_id = p_world and w.preview <> 'none' and c.deleted_at is null and c.is_npc and c.claimable
  order by c.name
  limit 100;
$$;
revoke execute on function public.world_preview_roles(uuid) from public, anon;
grant execute on function public.world_preview_roles(uuid) to authenticated;

-- Nach der Annahme eines Beitrittsantrags mit Rolle (Admin): Rolle gleich geben oder als offene Anfrage vormerken
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
  select id, name, is_npc, claimable, deleted_at into c from public.characters where id = r.character_id and world_id = r.world_id;
  if not found or c.deleted_at is not null or not c.is_npc or not c.claimable then
    return null;
  end if;
  if p_give then
    perform public._transfer_character(c.id, r.user_id, auth.uid());
  else
    insert into public.character_claims (world_id, character_id, user_id, kind, message, created_by)
    values (r.world_id, c.id, r.user_id, 'request', left(coalesce(r.message, ''), 500), r.user_id)
    on conflict do nothing;
  end if;
  return jsonb_build_object('character_id', c.id, 'character_name', c.name, 'user_id', r.user_id, 'world_id', r.world_id, 'given', p_give);
end;
$$;
revoke execute on function public.resolve_requested_role(uuid, boolean) from public, anon;
grant execute on function public.resolve_requested_role(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
