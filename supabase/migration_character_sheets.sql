-- Charakterbogen („ChaBo“) pro Charakter: Attribute, Talente, persönliche Infos, Notizen, Bild.
-- Alles in einem JSON-Feld (Form wie der alte Charakterbogen), geprüft wird in der App (lib/sheet-rules.ts).
create table if not exists public.character_sheets (
  character_id uuid primary key references public.characters (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint character_sheets_size check (octet_length(data::text) <= 300000)
);

alter table public.character_sheets enable row level security;

drop policy if exists "character_sheets_select_world_member" on public.character_sheets;
create policy "character_sheets_select_world_member" on public.character_sheets
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheets.character_id and public.is_world_member(c.world_id))
  );

drop policy if exists "character_sheets_insert_owner" on public.character_sheets;
create policy "character_sheets_insert_owner" on public.character_sheets
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheets_update_owner" on public.character_sheets;
create policy "character_sheets_update_owner" on public.character_sheets
  for update to authenticated
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid()));

drop policy if exists "character_sheets_delete_owner" on public.character_sheets;
create policy "character_sheets_delete_owner" on public.character_sheets
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.owner_id = auth.uid())
  );

revoke all on public.character_sheets from anon;
grant select, insert, update, delete on public.character_sheets to authenticated;
