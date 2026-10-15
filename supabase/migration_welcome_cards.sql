-- Willkommens-Karten und Freunde finden: Beitritte werden in der Redaktion angekündigt (abschaltbar), mit „Befreunden“ und „Begrüßen“.
alter table public.profiles add column if not exists announce_joins boolean not null default true;
alter table public.profiles add column if not exists intro_public boolean not null default false;

create table if not exists public.welcome_announcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Welt-Karte (nur für Mitglieder dieser Welt) oder App-weit (null, nur mit Zustimmung)
  world_id uuid references public.worlds (id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists welcome_announcements_world_idx on public.welcome_announcements (user_id, world_id) where world_id is not null;
create unique index if not exists welcome_announcements_app_idx on public.welcome_announcements (user_id) where world_id is null;
create index if not exists welcome_announcements_recent_idx on public.welcome_announcements (created_at desc);

alter table public.welcome_announcements enable row level security;
drop policy if exists welcome_announcements_select on public.welcome_announcements;
create policy welcome_announcements_select on public.welcome_announcements
  for select to authenticated using (world_id is null or public.is_world_member(world_id));

create table if not exists public.welcome_greetings (
  announcement_id uuid not null references public.welcome_announcements (id) on delete cascade,
  from_user uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (announcement_id, from_user)
);
alter table public.welcome_greetings enable row level security;
drop policy if exists welcome_greetings_select on public.welcome_greetings;
create policy welcome_greetings_select on public.welcome_greetings
  for select to authenticated using (from_user = (select auth.uid()));
drop policy if exists welcome_greetings_insert on public.welcome_greetings;
create policy welcome_greetings_insert on public.welcome_greetings
  for insert to authenticated with check (
    from_user = (select auth.uid())
    and exists (select 1 from public.welcome_announcements a where a.id = announcement_id and a.user_id <> (select auth.uid()))
  );

-- Beitritt zu einer Welt ankündigen (nicht die eigene Welt, nicht die Übungswelt, nicht Test- und offizielle Konten)
create or replace function public.announce_world_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
  p record;
begin
  select created_by, coalesce(is_demo, false) as is_demo into w from public.worlds where id = new.world_id;
  if not found or w.created_by = new.user_id or w.is_demo then
    return new;
  end if;
  select announce_joins into p from public.profiles where id = new.user_id;
  if not coalesce(p.announce_joins, true) then
    return new;
  end if;
  if exists (select 1 from public.account_marks m where m.user_id = new.user_id and m.kind in ('test', 'official')) then
    return new;
  end if;
  insert into public.welcome_announcements (user_id, world_id) values (new.user_id, new.world_id) on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists world_members_announce_trg on public.world_members;
create trigger world_members_announce_trg after insert on public.world_members
  for each row execute function public.announce_world_join();

-- Neues Konto: Vorstellung für alle nur, wenn bei der Registrierung gewünscht
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intro boolean := coalesce((new.raw_user_meta_data ->> 'intro_public') = 'true', false);
begin
  insert into public.profiles (id, username, intro_public)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)), v_intro);
  if v_intro then
    insert into public.welcome_announcements (user_id, world_id) values (new.id, null) on conflict do nothing;
  end if;
  return new;
end;
$$;

-- Einstellungen: Beitritte ankündigen und App-weite Vorstellung ein-/ausschalten
create or replace function public.set_welcome_prefs(p_announce_joins boolean, p_intro_public boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet.'; end if;
  update public.profiles set announce_joins = p_announce_joins, intro_public = p_intro_public where id = auth.uid();
  if p_intro_public then
    insert into public.welcome_announcements (user_id, world_id) values (auth.uid(), null) on conflict do nothing;
  else
    delete from public.welcome_announcements where user_id = auth.uid() and world_id is null;
  end if;
  if not p_announce_joins then
    delete from public.welcome_announcements where user_id = auth.uid() and world_id is not null;
  end if;
end;
$$;
revoke all on function public.set_welcome_prefs(boolean, boolean) from public, anon;
grant execute on function public.set_welcome_prefs(boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
