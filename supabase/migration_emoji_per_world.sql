-- Neue Emojis gelten nur in der Welt, in der sie hochgeladen wurden. Bestehende bleiben wie bisher in allen Welten nutzbar
-- (world_only = false); der Name ist unter diesen eindeutig, bei Welt-Emojis je Welt.
alter table public.custom_emojis add column if not exists world_only boolean not null default false;

drop index if exists public.custom_emojis_name_idx;
create unique index if not exists custom_emojis_name_idx on public.custom_emojis (name) where not world_only;
create unique index if not exists custom_emojis_world_name_idx on public.custom_emojis (world_id, name) where world_only;

alter table public.custom_emojis drop constraint if exists custom_emojis_world_only_check;
alter table public.custom_emojis add constraint custom_emojis_world_only_check check (not world_only or world_id is not null);

drop policy if exists "custom_emojis_select_all" on public.custom_emojis;
drop policy if exists "custom_emojis_select_visible" on public.custom_emojis;
create policy "custom_emojis_select_visible" on public.custom_emojis
  for select to authenticated using (not world_only or public.is_world_member(world_id));

drop policy if exists "custom_emojis_insert_own" on public.custom_emojis;
drop policy if exists "custom_emojis_insert_own_scoped" on public.custom_emojis;
create policy "custom_emojis_insert_own_scoped" on public.custom_emojis
  for insert to authenticated with check (created_by = auth.uid() and (not world_only or public.is_world_member(world_id)));

-- Wird eine Welt gelöscht, verschwinden ihre Welt-Emojis mit (die älteren, weltübergreifenden bleiben wie bisher).
create or replace function public.delete_world_emojis()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.custom_emojis where world_id = old.id and world_only;
  return old;
end;
$$;
revoke execute on function public.delete_world_emojis() from public, anon, authenticated;

drop trigger if exists worlds_delete_emojis on public.worlds;
create trigger worlds_delete_emojis before delete on public.worlds
  for each row execute function public.delete_world_emojis();

notify pgrst, 'reload schema';
