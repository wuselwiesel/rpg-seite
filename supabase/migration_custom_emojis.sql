-- Eigene Emojis pro Welt (wie Discord-Server-Emojis): Mitglieder laden Bilder hoch und nutzen sie als :name: in Texten.
create table if not exists public.custom_emojis (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null check (name ~ '^[a-z0-9_]{2,32}$'),
  image_url text not null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists custom_emojis_world_name_idx on public.custom_emojis (world_id, name);

alter table public.custom_emojis enable row level security;

drop policy if exists "custom_emojis_select_member" on public.custom_emojis;
create policy "custom_emojis_select_member" on public.custom_emojis
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "custom_emojis_insert_member" on public.custom_emojis;
create policy "custom_emojis_insert_member" on public.custom_emojis
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

drop policy if exists "custom_emojis_delete_own_or_world_owner" on public.custom_emojis;
create policy "custom_emojis_delete_own_or_world_owner" on public.custom_emojis
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

notify pgrst, 'reload schema';
