-- Geheime Felder und Notizen im ChaBo: liegen bewusst in einer eigenen Tabelle, die nur die Besitzer:in des Charakters lesen und schreiben kann.
-- (Der normale ChaBo in character_sheets ist für alle in der Welt lesbar; Geheimes darf dort nie stehen.)
create table if not exists public.character_sheet_secrets (
  character_id uuid primary key references public.characters (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint character_sheet_secrets_size check (octet_length(data::text) <= 300000)
);

alter table public.character_sheet_secrets enable row level security;

drop policy if exists "character_sheet_secrets_select_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_select_owner" on public.character_sheet_secrets
  for select to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheet_secrets_insert_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_insert_owner" on public.character_sheet_secrets
  for insert to authenticated with check (
    exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid())
  );

drop policy if exists "character_sheet_secrets_update_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_update_owner" on public.character_sheet_secrets
  for update to authenticated
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid()));

drop policy if exists "character_sheet_secrets_delete_owner" on public.character_sheet_secrets;
create policy "character_sheet_secrets_delete_owner" on public.character_sheet_secrets
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.owner_id = auth.uid())
  );

revoke all on public.character_sheet_secrets from anon;
grant select, insert, update, delete on public.character_sheet_secrets to authenticated;
