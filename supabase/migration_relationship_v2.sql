-- Beziehungsnetz, zweite Runde: gegenseitige Sicht, geheime Beziehungen, beenden statt löschen, weitere Familienrollen.
alter table public.character_relationships
  add column if not exists type_b text,
  add column if not exists is_secret boolean not null default false,
  add column if not exists ended_on date,
  add column if not exists ended_label text;

alter table public.character_relationships drop constraint if exists character_relationships_family_role_check;
alter table public.character_relationships
  add constraint character_relationships_family_role_check
  check (family_role is null or family_role in ('eltern', 'partner', 'geschwister', 'verwandt', 'halbgeschwister', 'adoptiv'));

-- Geheime Beziehungen sieht nur, wer sie eingetragen hat.
drop policy if exists "character_relationships_select_member" on public.character_relationships;
create policy "character_relationships_select_member" on public.character_relationships
  for select to authenticated using (
    public.is_world_member(world_id) and (not is_secret or created_by = auth.uid())
  );

-- Löschen dürfen: Ersteller:in, Welt-Besitzer:in und die Besitzer:innen der beiden Charaktere.
drop policy if exists "character_relationships_delete_own_or_world_owner" on public.character_relationships;
drop policy if exists "character_relationships_delete_involved" on public.character_relationships;
create policy "character_relationships_delete_involved" on public.character_relationships
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
    or exists (
      select 1 from public.characters c
      where c.id in (character_a_id, character_b_id) and c.owner_id = auth.uid()
    )
  );

-- Verlauf: Beenden und gegenseitige Sicht mitführen
alter table public.relationship_history
  add column if not exists type_b text,
  add column if not exists ended_on date,
  add column if not exists ended_label text;

drop policy if exists "relationship_history_select_member" on public.relationship_history;
create policy "relationship_history_select_member" on public.relationship_history
  for select to authenticated using (
    public.is_world_member(world_id)
    and exists (select 1 from public.character_relationships r where r.id = relationship_id)
  );

create or replace function public.log_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, type_b, ended_on, ended_label, created_by)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, null, new.type_b, new.ended_on, new.ended_label, auth.uid());
  elsif new.type is distinct from old.type
     or new.category is distinct from old.category
     or new.color is distinct from old.color
     or new.label is distinct from old.label
     or new.type_b is distinct from old.type_b
     or new.ended_on is distinct from old.ended_on
     or new.ended_label is distinct from old.ended_label then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, type_b, ended_on, ended_label, created_by)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, new.change_note, new.type_b, new.ended_on, new.ended_label, auth.uid());
    new.change_note := null;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- ChaBo-Zeilen: Bezeichnung je Seite (gegenseitige Sicht), beendete Beziehungen, geheime werden nicht übertragen
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
  if e.is_secret and not p_remove then return; end if;
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
      when e.family_role = 'adoptiv' then (case when side = e.character_a_id then 'Adoptivkind' else 'Adoptivelternteil' end)
      when side = e.character_a_id then left(e.type, 40)
      else left(coalesce(nullif(e.type_b, ''), e.type), 40)
    end;
    if e.ended_on is not null or coalesce(e.ended_label, '') <> '' then
      lbl := left(coalesce(nullif(e.ended_label, ''), 'Ehemals ' || lbl), 40);
    end if;

    select data into doc from public.character_sheets where character_id = side;
    if doc is null then continue; end if;
    fam := coalesce(doc -> 'family', '[]'::jsonb);
    newrows := '[]'::jsonb;
    has_row := false;
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
