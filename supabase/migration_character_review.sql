-- Charaktere prüfen: Auf Wunsch der Welt landen neue Charaktere normaler Mitglieder zuerst „zur Prüfung“. Admins genehmigen oder lehnen
-- ab (mit Hinweis) und können zu jedem Feld eine Änderung vorschlagen, die die Besitzer:in übernimmt oder ablehnt.

alter table public.worlds add column if not exists review_characters boolean not null default false;

alter table public.characters add column if not exists review_status text not null default 'approved';
alter table public.characters add column if not exists review_note text;
alter table public.characters add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.characters add column if not exists reviewed_at timestamptz;
do $$ begin
  alter table public.characters add constraint characters_review_status_check check (review_status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.characters add constraint characters_review_note_len check (review_note is null or char_length(review_note) <= 500);
exception when duplicate_object then null; end $$;
create index if not exists characters_review_idx on public.characters (world_id) where review_status <> 'approved';

-- Neue Charaktere normaler Mitglieder starten „zur Prüfung“, wenn die Welt das verlangt (Admins und NPCs nicht)
create or replace function public.characters_review_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_npc or auth.uid() is null or public.is_world_admin(new.world_id) then
    new.review_status := 'approved';
  elsif exists (select 1 from public.worlds w where w.id = new.world_id and w.review_characters) then
    new.review_status := 'pending';
  else
    new.review_status := 'approved';
  end if;
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end $$;
revoke all on function public.characters_review_insert() from public, anon;
grant execute on function public.characters_review_insert() to authenticated;
drop trigger if exists characters_review_insert_trg on public.characters;
create trigger characters_review_insert_trg before insert on public.characters
  for each row execute function public.characters_review_insert();

-- Den Stand ändern nur Admins; die Besitzer:in darf einen abgelehnten Charakter erneut einreichen (→ „zur Prüfung“)
create or replace function public.characters_review_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.review_status is not distinct from old.review_status
     and new.review_note is not distinct from old.review_note
     and new.reviewed_by is not distinct from old.reviewed_by
     and new.reviewed_at is not distinct from old.reviewed_at then
    return new;
  end if;
  if public.is_world_admin(old.world_id) then
    if new.review_status is distinct from old.review_status then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
    return new;
  end if;
  if old.owner_id = auth.uid() and old.review_status = 'rejected' and new.review_status = 'pending'
     and new.review_note is not distinct from old.review_note
     and new.reviewed_by is not distinct from old.reviewed_by
     and new.reviewed_at is not distinct from old.reviewed_at then
    return new;
  end if;
  raise exception 'Den Prüfstand eines Charakters ändern nur Admins der Welt.';
end $$;
revoke all on function public.characters_review_guard() from public, anon;
grant execute on function public.characters_review_guard() to authenticated;
drop trigger if exists characters_review_guard_trg on public.characters;
create trigger characters_review_guard_trg before update on public.characters
  for each row execute function public.characters_review_guard();

-- Admin entscheidet über einen Charakter (Besitzer:innen anderer Charaktere können sie sonst nicht ändern)
create or replace function public.review_character(p_character uuid, p_status text, p_note text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if p_status not in ('approved', 'rejected', 'pending') then
    raise exception 'Unbekannter Stand.';
  end if;
  select id, name, world_id, owner_id, is_npc into c from public.characters where id = p_character and deleted_at is null;
  if not found then
    raise exception 'Charakter nicht gefunden.';
  end if;
  if not public.is_world_admin(c.world_id) then
    raise exception 'Das dürfen nur Admins der Welt.';
  end if;
  update public.characters
     set review_status = p_status,
         review_note = nullif(left(trim(coalesce(p_note, '')), 500), '')
   where id = p_character;
  return jsonb_build_object('character_id', c.id, 'character_name', c.name, 'world_id', c.world_id, 'owner_id', c.owner_id);
end $$;
revoke all on function public.review_character(uuid, text, text) from public, anon;
grant execute on function public.review_character(uuid, text, text) to authenticated;

-- Änderungsvorschläge: Admins schlagen zu einem Feld einen neuen Wert vor, die Besitzer:in übernimmt oder lehnt ab
create table if not exists public.character_change_proposals (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  proposed_by uuid references public.profiles (id) on delete set null,
  field_key text not null check (char_length(field_key) between 1 and 120),
  field_label text not null check (char_length(field_label) between 1 and 160),
  old_value text not null default '' check (char_length(old_value) <= 30000),
  new_value text not null default '' check (char_length(new_value) <= 30000),
  note text not null default '' check (char_length(note) <= 500),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined', 'withdrawn')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists character_change_proposals_char_idx on public.character_change_proposals (character_id, status);
create index if not exists character_change_proposals_world_idx on public.character_change_proposals (world_id, status);

alter table public.character_change_proposals enable row level security;
drop policy if exists character_change_proposals_select on public.character_change_proposals;
create policy character_change_proposals_select on public.character_change_proposals
  for select to authenticated using (
    public.is_world_admin(world_id)
    or exists (select 1 from public.characters c where c.id = character_change_proposals.character_id and c.owner_id = (select auth.uid()))
  );
-- Schreiben nur über die Funktionen unten

create or replace function public.propose_character_change(p_character uuid, p_key text, p_label text, p_old text, p_new text, p_note text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; new_id uuid;
begin
  select id, name, world_id, owner_id into c from public.characters where id = p_character and deleted_at is null;
  if not found then
    raise exception 'Charakter nicht gefunden.';
  end if;
  if not public.is_world_admin(c.world_id) then
    raise exception 'Änderungen vorschlagen dürfen nur Admins der Welt.';
  end if;
  update public.character_change_proposals set status = 'withdrawn', decided_at = now()
   where character_id = p_character and field_key = p_key and status = 'open';
  insert into public.character_change_proposals (world_id, character_id, proposed_by, field_key, field_label, old_value, new_value, note)
  values (c.world_id, c.id, auth.uid(), p_key, left(p_label, 160), left(coalesce(p_old, ''), 30000), left(coalesce(p_new, ''), 30000), left(trim(coalesce(p_note, '')), 500))
  returning id into new_id;
  return jsonb_build_object('id', new_id, 'character_id', c.id, 'character_name', c.name, 'world_id', c.world_id, 'owner_id', c.owner_id);
end $$;
revoke all on function public.propose_character_change(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.propose_character_change(uuid, text, text, text, text, text) to authenticated;

-- Besitzer:in entscheidet (nimmt an oder lehnt ab), Admins ziehen zurück
create or replace function public.decide_character_change(p_proposal uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare p record; c record;
begin
  if p_status not in ('accepted', 'declined', 'withdrawn') then
    raise exception 'Unbekannter Stand.';
  end if;
  select * into p from public.character_change_proposals where id = p_proposal;
  if not found or p.status <> 'open' then
    raise exception 'Dieser Vorschlag ist nicht mehr offen.';
  end if;
  select id, name, owner_id, world_id into c from public.characters where id = p.character_id;
  if p_status = 'withdrawn' then
    if not public.is_world_admin(p.world_id) then
      raise exception 'Zurückziehen dürfen nur Admins der Welt.';
    end if;
  elsif c.owner_id is distinct from auth.uid() then
    raise exception 'Darüber entscheidet die Besitzer:in des Charakters.';
  end if;
  update public.character_change_proposals set status = p_status, decided_at = now() where id = p_proposal;
  return jsonb_build_object('id', p.id, 'field_label', p.field_label, 'proposed_by', p.proposed_by, 'character_id', c.id, 'character_name', c.name, 'world_id', p.world_id, 'owner_id', c.owner_id);
end $$;
revoke all on function public.decide_character_change(uuid, text) from public, anon;
grant execute on function public.decide_character_change(uuid, text) to authenticated;

notify pgrst, 'reload schema';
