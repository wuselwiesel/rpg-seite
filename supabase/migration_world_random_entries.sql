-- Eigene Zufallslisten pro Welt (Vornamen, Hobbys, Geheimnisse …): Der ChaBo-Generator mischt sie unter die mitgelieferten Listen.
-- Alle Mitglieder der Welt lesen und ergänzen; löschen dürfen die Person, die den Eintrag angelegt hat, und die Besitzerin der Welt.
create table if not exists public.world_random_entries (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  kind text not null check (kind in ('vorname', 'nachname', 'spitzname', 'hobby', 'beruf', 'eigenheit', 'lebensziel', 'geheimnis', 'angst')),
  text text not null check (char_length(text) between 1 and 200),
  created_by uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index if not exists world_random_entries_unique_idx on public.world_random_entries (world_id, kind, lower(text));
create index if not exists world_random_entries_world_idx on public.world_random_entries (world_id, kind);
alter table public.world_random_entries enable row level security;

create policy "world_random_entries_select_member" on public.world_random_entries
  for select to authenticated using (public.is_world_member(world_id));
create policy "world_random_entries_insert_member" on public.world_random_entries
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));
create policy "world_random_entries_delete_own_or_world_owner" on public.world_random_entries
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );
