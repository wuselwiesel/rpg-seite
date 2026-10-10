-- Beziehungsnetz und ChaBo-Abschnitt „Familie/Beziehungen“ gleichen sich ab.
-- Eine Zeile im ChaBo trägt `relId` (= Beziehung im Netz). Diese Funktion schreibt eine Beziehung in die ChaBo-Zeilen
-- beider Figuren (oder entfernt sie dort). Sie läuft als Definer, weil man den Bogen der anderen Figur sonst nicht ändern darf.
create or replace function public.sync_relationship_sheets(p_rel uuid, p_skip uuid default null, p_remove boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  side uuid;
  other uuid;
  other_name text;
  lbl text;
  doc jsonb;
  fam jsonb;
  newrows jsonb;
  item jsonb;
  has_row boolean;
  adopt_idx int;
  idx int;
begin
  select * into e from public.character_relationships where id = p_rel;
  if not found then return; end if;
  if auth.uid() is not null and not public.is_world_member(e.world_id) then
    raise exception 'Nicht erlaubt';
  end if;

  foreach side in array array[e.character_a_id, e.character_b_id] loop
    if p_skip is not null and side = p_skip then continue; end if;
    other := case when side = e.character_a_id then e.character_b_id else e.character_a_id end;
    select name into other_name from public.characters where id = other;
    if other_name is null then continue; end if;
    lbl := case
      when e.family_role = 'eltern' then (case when side = e.character_a_id then 'Kind' else 'Elternteil' end)
      else left(e.type, 40)
    end;

    select data into doc from public.character_sheets where character_id = side;
    -- Figuren ohne ChaBo (nur der alte Bogen) bleiben unberührt
    if doc is null then continue; end if;
    fam := coalesce(doc -> 'family', '[]'::jsonb);
    newrows := '[]'::jsonb;
    has_row := false;
    -- Gibt es schon eine eigene, noch nicht verknüpfte Zeile, die diese Figur nennt, wird sie übernommen statt eine zweite anzulegen
    adopt_idx := -1;
    if not p_remove and not exists (select 1 from jsonb_array_elements(fam) f where f ->> 'relId' = p_rel::text) then
      select ord - 1 into adopt_idx
      from jsonb_array_elements(fam) with ordinality as t(f, ord)
      where coalesce(f ->> 'relId', '') = ''
        and coalesce((f ->> 'secret')::boolean, false) = false
        and position(lower('@' || other_name) in lower(coalesce(f ->> 'value', ''))) > 0
      order by ord
      limit 1;
      adopt_idx := coalesce(adopt_idx, -1);
    end if;
    idx := 0;
    for item in select value from jsonb_array_elements(fam) loop
      if item ->> 'relId' = p_rel::text then
        if p_remove then idx := idx + 1; continue; end if;
        has_row := true;
        newrows := newrows || jsonb_build_array(item || jsonb_build_object('label', lbl, 'value', '@' || other_name));
      elsif idx = adopt_idx then
        has_row := true;
        newrows := newrows || jsonb_build_array(item || jsonb_build_object('relId', p_rel::text));
      else
        newrows := newrows || jsonb_build_array(item);
      end if;
      idx := idx + 1;
    end loop;
    if not has_row and not p_remove then
      if jsonb_array_length(newrows) >= 30 then continue; end if;
      newrows := newrows || jsonb_build_array(jsonb_build_object('label', lbl, 'value', '@' || other_name, 'relId', p_rel::text));
    end if;

    insert into public.character_sheets (character_id, data, updated_at)
    values (side, jsonb_set(doc, '{family}', newrows), now())
    on conflict (character_id) do update set data = excluded.data, updated_at = excluded.updated_at;
  end loop;
end;
$$;

revoke all on function public.sync_relationship_sheets(uuid, uuid, boolean) from public, anon;
grant execute on function public.sync_relationship_sheets(uuid, uuid, boolean) to authenticated;

-- Beim Löschen einer Beziehung: Zeilen mit dieser relId aus beiden ChaBo-Bögen nehmen (nur wenn die Beziehung nicht mehr existiert)
create or replace function public.unlink_relationship_sheets(p_rel uuid, p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  side uuid;
  w uuid;
begin
  if exists (select 1 from public.character_relationships where id = p_rel) then return; end if;
  select world_id into w from public.characters where id = p_a;
  if w is null then return; end if;
  if auth.uid() is not null and not public.is_world_member(w) then
    raise exception 'Nicht erlaubt';
  end if;
  foreach side in array array[p_a, p_b] loop
    update public.character_sheets s
    set data = jsonb_set(
          s.data, '{family}',
          coalesce((select jsonb_agg(f) from jsonb_array_elements(coalesce(s.data -> 'family', '[]'::jsonb)) f
                    where coalesce(f ->> 'relId', '') <> p_rel::text), '[]'::jsonb)
        ),
        updated_at = now()
    where s.character_id = side
      and exists (select 1 from jsonb_array_elements(coalesce(s.data -> 'family', '[]'::jsonb)) f where f ->> 'relId' = p_rel::text);
  end loop;
end;
$$;

revoke all on function public.unlink_relationship_sheets(uuid, uuid, uuid) from public, anon;
grant execute on function public.unlink_relationship_sheets(uuid, uuid, uuid) to authenticated;

-- Einmalig: alle bestehenden Beziehungen in die ChaBo-Zeilen übertragen
select public.sync_relationship_sheets(id) from public.character_relationships;
