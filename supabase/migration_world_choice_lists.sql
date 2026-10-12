-- Auswahllisten je Welt (Wesen, Haus/Fraktion, Beruf …): Admins legen Listen mit Einträgen an, je Liste als Dropdown
-- oder freies Textfeld. Die Liste „Wesen“ (is_species) gibt es in jeder Welt; sie ersetzt beim Anlegen die feste Auswahl,
-- sobald sie Einträge hat oder als Textfeld läuft. Gewählte Werte stehen je Charakter in characters.choices (Listen-ID → Text).
create table if not exists public.world_choice_lists (
  id uuid primary key default gen_random_uuid(),
  world_id uuid not null references public.worlds(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 40),
  mode text not null default 'dropdown' check (mode in ('dropdown', 'text')),
  is_species boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists world_choice_lists_species_idx on public.world_choice_lists (world_id) where is_species;
create unique index if not exists world_choice_lists_label_idx on public.world_choice_lists (world_id, lower(label));

create table if not exists public.world_choice_options (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.world_choice_lists(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (list_id, label)
);
create index if not exists world_choice_options_list_idx on public.world_choice_options (list_id);

alter table public.characters add column if not exists choices jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'characters_choices_object') then
    alter table public.characters add constraint characters_choices_object check (jsonb_typeof(choices) = 'object');
  end if;
end $$;

alter table public.world_choice_lists enable row level security;
alter table public.world_choice_options enable row level security;

create policy world_choice_lists_select on public.world_choice_lists
  for select to authenticated using (public.is_world_member(world_id));
create policy world_choice_lists_insert on public.world_choice_lists
  for insert to authenticated with check (public.is_world_admin(world_id) and not is_species);
create policy world_choice_lists_update on public.world_choice_lists
  for update to authenticated using (public.is_world_admin(world_id)) with check (public.is_world_admin(world_id));
create policy world_choice_lists_delete on public.world_choice_lists
  for delete to authenticated using (public.is_world_admin(world_id) and not is_species);

create policy world_choice_options_select on public.world_choice_options
  for select to authenticated using (exists (select 1 from public.world_choice_lists l where l.id = list_id and public.is_world_member(l.world_id)));
create policy world_choice_options_write on public.world_choice_options
  for all to authenticated
  using (exists (select 1 from public.world_choice_lists l where l.id = list_id and public.is_world_admin(l.world_id)))
  with check (exists (select 1 from public.world_choice_lists l where l.id = list_id and public.is_world_admin(l.world_id)));

-- Jede Welt hat von Anfang an die Liste „Wesen“ (ohne Einträge bleibt die feste Auswahl aktiv).
create or replace function public.seed_species_list_for_new_world()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.world_choice_lists (world_id, label, mode, is_species) values (new.id, 'Wesen', 'dropdown', true)
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.seed_species_list_for_new_world() from anon, authenticated, public;
drop trigger if exists world_species_list_trg on public.worlds;
create trigger world_species_list_trg after insert on public.worlds for each row execute function public.seed_species_list_for_new_world();

insert into public.world_choice_lists (world_id, label, mode, is_species)
select w.id, 'Wesen', 'dropdown', true from public.worlds w
where not exists (select 1 from public.world_choice_lists l where l.world_id = w.id and l.is_species)
on conflict do nothing;
