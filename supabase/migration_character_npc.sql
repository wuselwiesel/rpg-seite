-- NPCs: Charaktere ohne Spieler:in dahinter. `owner_id` bleibt die Person, die den NPC angelegt hat (Anleger:in).
-- Alle Mitglieder der Welt dürfen NPCs anlegen (bestehende Policy characters_insert_own). Bearbeiten und löschen dürfen Anleger:in und
-- die Besitzerin der Welt. Zwischen NPC und normalem Charakter umschalten darf nur die Anleger:in selbst. NPCs folgen und werden nicht
-- automatisch gefolgt.
alter table public.characters add column if not exists is_npc boolean not null default false;
create index if not exists characters_npc_idx on public.characters (world_id) where is_npc;

create or replace function public.is_world_owner(_world_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.worlds w where w.id = _world_id and w.created_by = auth.uid());
$$;
revoke all on function public.is_world_owner(uuid) from public, anon;
grant execute on function public.is_world_owner(uuid) to authenticated;

-- Welt-Besitzerin darf NPCs ändern und löschen (normale Charaktere bleiben ihren Besitzer:innen vorbehalten).
drop policy if exists "characters_update_world_owner_npc" on public.characters;
create policy "characters_update_world_owner_npc" on public.characters for update
  using (is_npc and public.is_world_owner(world_id)) with check (is_npc and public.is_world_owner(world_id));
drop policy if exists "characters_delete_world_owner_npc" on public.characters;
create policy "characters_delete_world_owner_npc" on public.characters for delete
  using (is_npc and public.is_world_owner(world_id));

-- Nur die Besitzer:in schaltet um und nur sie gibt den Charakter weiter (die Welt-Besitzerin darf also nichts davon).
create or replace function public.characters_npc_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and old.owner_id <> auth.uid() then
    if new.is_npc is distinct from old.is_npc then
      raise exception 'Nur die Person, die den Charakter angelegt hat, kann ihn zum NPC machen oder zurückverwandeln.';
    end if;
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Die Besitzer:in eines Charakters kann nur sie selbst ändern.';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.characters_npc_guard() from public, anon;
grant execute on function public.characters_npc_guard() to authenticated;
drop trigger if exists characters_npc_guard_trg on public.characters;
create trigger characters_npc_guard_trg before update on public.characters
  for each row execute function public.characters_npc_guard();

-- Charakterbogen, Geheimes und Verlauf von NPCs darf auch die Welt-Besitzerin bearbeiten.
drop policy if exists "character_sheets_insert_world_owner_npc" on public.character_sheets;
create policy "character_sheets_insert_world_owner_npc" on public.character_sheets for insert with check (
  exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheets_update_world_owner_npc" on public.character_sheets;
create policy "character_sheets_update_world_owner_npc" on public.character_sheets for update
  using (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheets_delete_world_owner_npc" on public.character_sheets;
create policy "character_sheets_delete_world_owner_npc" on public.character_sheets for delete using (
  exists (select 1 from public.characters c where c.id = character_sheets.character_id and c.is_npc and public.is_world_owner(c.world_id)));

drop policy if exists "character_sheet_secrets_select_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_select_world_owner_npc" on public.character_sheet_secrets for select using (
  exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheet_secrets_insert_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_insert_world_owner_npc" on public.character_sheet_secrets for insert with check (
  exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheet_secrets_update_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_update_world_owner_npc" on public.character_sheet_secrets for update
  using (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)))
  with check (exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));
drop policy if exists "character_sheet_secrets_delete_world_owner_npc" on public.character_sheet_secrets;
create policy "character_sheet_secrets_delete_world_owner_npc" on public.character_sheet_secrets for delete using (
  exists (select 1 from public.characters c where c.id = character_sheet_secrets.character_id and c.is_npc and public.is_world_owner(c.world_id)));

drop policy if exists "character_sheet_log_insert_world_owner_npc" on public.character_sheet_log;
create policy "character_sheet_log_insert_world_owner_npc" on public.character_sheet_log for insert with check (
  actor_id = auth.uid() and exists (select 1 from public.characters c where c.id = character_sheet_log.character_id and c.is_npc and public.is_world_owner(c.world_id)));

-- Automatisches Folgen: NPCs werden nicht einbezogen.
create or replace function public.autofollow_world_characters() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_npc then
    return new;
  end if;
  insert into public.character_follows (follower_id, followed_id, auto)
  select new.id, c.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
  on conflict do nothing;
  insert into public.character_follows (follower_id, followed_id, auto)
  select c.id, new.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
  on conflict do nothing;
  return new;
end $$;

-- Wird ein Charakter zum NPC, verschwinden seine automatischen Folgen; wird ein NPC zum Charakter, bekommt er sie wie ein neuer.
create or replace function public.npc_toggle_follows() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_npc then
    delete from public.character_follows where auto and (follower_id = new.id or followed_id = new.id);
  else
    insert into public.character_follows (follower_id, followed_id, auto)
    select new.id, c.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
    on conflict do nothing;
    insert into public.character_follows (follower_id, followed_id, auto)
    select c.id, new.id, true from public.characters c where c.world_id = new.world_id and c.id <> new.id and not c.is_npc
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.npc_toggle_follows() from public, anon;
grant execute on function public.npc_toggle_follows() to authenticated;
drop trigger if exists characters_npc_toggle_trg on public.characters;
create trigger characters_npc_toggle_trg after update of is_npc on public.characters
  for each row when (old.is_npc is distinct from new.is_npc) execute function public.npc_toggle_follows();

notify pgrst, 'reload schema';
