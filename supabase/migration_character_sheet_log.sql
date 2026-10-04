-- Verlauf der Änderungen am ChaBo: wer hat wann welches Feld geändert (alter → neuer Wert).
-- Aufeinanderfolgende Änderungen am selben Feld durch dieselbe Person innerhalb weniger Minuten werden von der App zu einer Zeile zusammengefasst.
create table if not exists public.character_sheet_log (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  field_key text not null check (char_length(field_key) <= 80),
  field_label text not null check (char_length(field_label) <= 80),
  old_value text check (old_value is null or char_length(old_value) <= 200),
  new_value text check (new_value is null or char_length(new_value) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists character_sheet_log_recent_idx on public.character_sheet_log (updated_at desc);
create index if not exists character_sheet_log_char_idx on public.character_sheet_log (character_id, actor_id, updated_at desc);

alter table public.character_sheet_log enable row level security;

drop policy if exists "character_sheet_log_select_world_member" on public.character_sheet_log;
create policy "character_sheet_log_select_world_member" on public.character_sheet_log
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and public.is_world_member(c.world_id))
  );

drop policy if exists "character_sheet_log_insert_owner" on public.character_sheet_log;
create policy "character_sheet_log_insert_owner" on public.character_sheet_log
  for insert to authenticated with check (
    actor_id = auth.uid()
    and exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheet_log_update_own" on public.character_sheet_log;
create policy "character_sheet_log_update_own" on public.character_sheet_log
  for update to authenticated using (actor_id = auth.uid()) with check (actor_id = auth.uid());

drop policy if exists "character_sheet_log_delete_own" on public.character_sheet_log;
create policy "character_sheet_log_delete_own" on public.character_sheet_log
  for delete to authenticated using (actor_id = auth.uid());

revoke all on public.character_sheet_log from anon;
grant select, insert, update, delete on public.character_sheet_log to authenticated;
