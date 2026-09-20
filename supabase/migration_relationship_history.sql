-- Migration: Beziehungen mit Kategorie, Verlauf und Stammbaum-Rollen; Haus/Familie pro Charakter

alter table public.characters add column if not exists house text;

alter table public.character_relationships
  add column if not exists category text not null default 'sonstiges',
  add column if not exists family_role text,
  add column if not exists change_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.character_relationships drop constraint if exists character_relationships_category_check;
alter table public.character_relationships
  add constraint character_relationships_category_check
  check (category in ('familie', 'liebe', 'freundschaft', 'rivalitaet', 'buendnis', 'sonstiges'));

alter table public.character_relationships drop constraint if exists character_relationships_family_role_check;
alter table public.character_relationships
  add constraint character_relationships_family_role_check
  check (family_role is null or family_role in ('eltern', 'partner', 'geschwister', 'verwandt'));

-- Bestehende Beziehungen anhand der Bezeichnung einer Kategorie zuordnen.
update public.character_relationships set category = case
  when type ilike any (array['%famil%', '%verwandt%', '%bruder%', '%schwester%', '%eltern%', '%vater%', '%mutter%', '%sohn%', '%tochter%']) then 'familie'
  when type ilike any (array['%lieb%', '%liiert%', '%partner%', '%ehe%', '%paar%', '%verlobt%']) then 'liebe'
  when type ilike any (array['%rival%', '%feind%', '%gegner%', '%hass%']) then 'rivalitaet'
  when type ilike any (array['%freund%', '%vertraut%']) then 'freundschaft'
  when type ilike any (array['%verb_ndet%', '%allianz%', '%b_ndnis%']) then 'buendnis'
  else 'sonstiges' end
where category = 'sonstiges';

create table if not exists public.relationship_history (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.character_relationships (id) on delete cascade,
  world_id uuid not null references public.worlds (id) on delete cascade,
  type text not null,
  category text not null,
  color text not null,
  label text,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists relationship_history_rel_idx on public.relationship_history (relationship_id, created_at);

alter table public.relationship_history enable row level security;

drop policy if exists "relationship_history_select_member" on public.relationship_history;
create policy "relationship_history_select_member" on public.relationship_history
  for select to authenticated using (public.is_world_member(world_id));

-- Jede Änderung von Art/Kategorie/Farbe/Notiz wird automatisch im Verlauf festgehalten.
create or replace function public.log_relationship_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, null, auth.uid());
  elsif new.type is distinct from old.type
     or new.category is distinct from old.category
     or new.color is distinct from old.color
     or new.label is distinct from old.label then
    insert into public.relationship_history (relationship_id, world_id, type, category, color, label, note, created_by)
    values (new.id, new.world_id, new.type, new.category, new.color, new.label, new.change_note, auth.uid());
    new.change_note := null;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists relationship_history_ins on public.character_relationships;
create trigger relationship_history_ins after insert on public.character_relationships
  for each row execute procedure public.log_relationship_change();

drop trigger if exists relationship_history_upd on public.character_relationships;
create trigger relationship_history_upd before update on public.character_relationships
  for each row execute procedure public.log_relationship_change();

-- Anfangsstand für bestehende Beziehungen.
insert into public.relationship_history (relationship_id, world_id, type, category, color, label, created_by, created_at)
select r.id, r.world_id, r.type, r.category, r.color, r.label, r.created_by, r.created_at
from public.character_relationships r
where not exists (select 1 from public.relationship_history h where h.relationship_id = r.id);

-- Ändern dürfen: Ersteller:in, Welt-Owner und die Besitzer:innen der beiden Charaktere.
drop policy if exists "character_relationships_update_involved" on public.character_relationships;
create policy "character_relationships_update_involved" on public.character_relationships
  for update to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
    or exists (
      select 1 from public.characters c
      where c.id in (character_a_id, character_b_id) and c.owner_id = auth.uid()
    )
  );
