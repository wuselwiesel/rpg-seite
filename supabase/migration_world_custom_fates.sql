-- Migration: Eigene Schicksale für den Schicksalswürfel, pro Welt. Sie werden unter die eingebauten gemischt.
-- Text mit {character1}..{character3}; die Zahl der Zusatz-Charaktere ergibt sich aus den Platzhaltern (targets).
-- Alle Mitglieder der Welt lesen und ergänzen; ändern und löschen dürfen die Person, die es angelegt hat, und die Besitzerin der Welt.
create table if not exists public.world_custom_fates (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  category text not null check (category in ('Beziehung','Familie','Gefahr','Kriminalität','Vergangenheit','Vampir','Werwolf')),
  severity text not null check (severity in ('leicht','mittel','schwer','sehr schwer','extrem')),
  text text not null check (char_length(text) between 5 and 500),
  targets smallint not null default 0 check (targets between 0 and 2),
  created_by uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists world_custom_fates_world_idx on public.world_custom_fates (world_id);

alter table public.world_custom_fates enable row level security;

drop policy if exists "world_custom_fates_select_member" on public.world_custom_fates;
create policy "world_custom_fates_select_member" on public.world_custom_fates
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "world_custom_fates_insert_member" on public.world_custom_fates;
create policy "world_custom_fates_insert_member" on public.world_custom_fates
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

drop policy if exists "world_custom_fates_update_own_or_world_owner" on public.world_custom_fates;
create policy "world_custom_fates_update_own_or_world_owner" on public.world_custom_fates
  for update to authenticated
  using (created_by = auth.uid() or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid()))
  with check (created_by = auth.uid() or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid()));

drop policy if exists "world_custom_fates_delete_own_or_world_owner" on public.world_custom_fates;
create policy "world_custom_fates_delete_own_or_world_owner" on public.world_custom_fates
  for delete to authenticated
  using (created_by = auth.uid() or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid()));

notify pgrst, 'reload schema';
