-- Beziehungsnetz: eigene Daten ("gilt seit …") pro Verlaufsschritt.
alter table public.relationship_history add column if not exists occurred_on date;
-- Datum, das beim Anlegen/Weiterentwickeln mitgeschickt wird (wie change_note); der Trigger übernimmt es in den Verlauf.
alter table public.character_relationships add column if not exists change_date date;

create or replace function public.log_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by, occurred_on)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, null, auth.uid(), new.change_date);
  elsif new.type is distinct from old.type
     or new.category is distinct from old.category
     or new.color is distinct from old.color
     or new.label is distinct from old.label then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by, occurred_on)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, new.change_note, auth.uid(), new.change_date);
    new.change_note := null;
    new.change_date := null;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Datum und Notiz eines vorhandenen Verlaufsschritts nachträglich ändern (wer die Beziehung bearbeiten darf).
create or replace function public.update_relationship_step(p_step_id uuid, p_occurred_on date, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rel uuid;
begin
  select relationship_id into v_rel from public.relationship_history where id = p_step_id;
  if v_rel is null then
    raise exception 'Schritt nicht gefunden';
  end if;
  if not exists (
    select 1 from public.character_relationships r
    where r.id = v_rel
      and (
        r.created_by = auth.uid()
        or exists (select 1 from public.worlds w where w.id = r.world_id and w.created_by = auth.uid())
        or exists (
          select 1 from public.characters c
          where c.id in (r.character_a_id, r.character_b_id) and c.owner_id = auth.uid()
        )
      )
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.relationship_history
    set occurred_on = p_occurred_on, note = nullif(left(coalesce(p_note, ''), 300), '')
    where id = p_step_id;
end;
$$;

grant execute on function public.update_relationship_step(uuid, date, text) to authenticated;

notify pgrst, 'reload schema';
