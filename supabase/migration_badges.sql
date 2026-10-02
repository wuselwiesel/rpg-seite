-- Badges: eigene/verliehene Badges pro Welt (badge_defs) und alle vergebenen Badges (badge_awards).
-- badge_key: 'auto:<schlüssel>' (automatische Erfolge eines Charakters), 'account:<schlüssel>' (Redaktions-Abzeichen eines Accounts),
-- 'custom:<def-id>' (von Mitgliedern gestaltete bzw. von der Spielleitung verliehene Badges).
create table if not exists public.badge_defs (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 40),
  description text check (char_length(coalesce(description, '')) <= 200),
  icon text not null check (char_length(icon) between 1 and 40),
  color text not null default '#96565d' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists badge_defs_world_idx on public.badge_defs (world_id);

create table if not exists public.badge_awards (
  id uuid primary key default gen_random_uuid(),
  badge_key text not null,
  character_id uuid references public.characters (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  def_id uuid references public.badge_defs (id) on delete cascade,
  awarded_by uuid references public.profiles (id) on delete set null,
  awarded_at timestamptz not null default now(),
  constraint badge_awards_one_recipient check ((character_id is not null) <> (user_id is not null))
);

create unique index if not exists badge_awards_character_key_idx on public.badge_awards (badge_key, character_id) where character_id is not null;
create unique index if not exists badge_awards_user_key_idx on public.badge_awards (badge_key, user_id) where user_id is not null;
create index if not exists badge_awards_character_idx on public.badge_awards (character_id);
create index if not exists badge_awards_user_idx on public.badge_awards (user_id);

alter table public.characters add column if not exists featured_badge_id uuid references public.badge_awards (id) on delete set null;
alter table public.profiles add column if not exists featured_badge_id uuid references public.badge_awards (id) on delete set null;

alter table public.badge_defs enable row level security;
alter table public.badge_awards enable row level security;

drop policy if exists "badge_defs_select_member" on public.badge_defs;
create policy "badge_defs_select_member" on public.badge_defs
  for select to authenticated using (public.is_world_member(world_id));

drop policy if exists "badge_defs_insert_member" on public.badge_defs;
create policy "badge_defs_insert_member" on public.badge_defs
  for insert to authenticated with check (created_by = auth.uid() and public.is_world_member(world_id));

drop policy if exists "badge_defs_update_own" on public.badge_defs;
create policy "badge_defs_update_own" on public.badge_defs
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "badge_defs_delete_own_or_world_owner" on public.badge_defs;
create policy "badge_defs_delete_own_or_world_owner" on public.badge_defs
  for delete to authenticated using (
    created_by = auth.uid()
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

drop policy if exists "badge_awards_select_visible" on public.badge_awards;
create policy "badge_awards_select_visible" on public.badge_awards
  for select to authenticated using (
    (character_id is not null and exists (
      select 1 from public.characters c where c.id = character_id and public.is_world_member(c.world_id)
    ))
    or (user_id is not null and (user_id = auth.uid() or public.is_friend_of(user_id)))
  );

drop policy if exists "badge_awards_insert" on public.badge_awards;
create policy "badge_awards_insert" on public.badge_awards
  for insert to authenticated with check (
    (badge_key like 'auto:%' and character_id is not null and awarded_by is null and exists (
      select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()
    ))
    or (badge_key like 'account:%' and user_id = auth.uid() and awarded_by is null)
    or (badge_key like 'custom:%' and character_id is not null and def_id is not null and awarded_by = auth.uid() and exists (
      select 1
      from public.badge_defs d
      join public.characters c on c.world_id = d.world_id
      where d.id = def_id and c.id = character_id
        and (d.created_by = auth.uid() or exists (select 1 from public.worlds w where w.id = d.world_id and w.created_by = auth.uid()))
    ))
  );

drop policy if exists "badge_awards_delete" on public.badge_awards;
create policy "badge_awards_delete" on public.badge_awards
  for delete to authenticated using (
    awarded_by = auth.uid()
    or user_id = auth.uid()
    or exists (
      select 1 from public.characters c
      left join public.worlds w on w.id = c.world_id
      where c.id = character_id and (c.owner_id = auth.uid() or w.created_by = auth.uid())
    )
  );

notify pgrst, 'reload schema';
