-- Konto-Markierungen: Siegel am Namen (builder = App-Bastler:in, verified = verifiziert, official = offizielles Wortwinkel-Konto),
-- Rolle admin (Überblick) und test (Testkonten, zählen in Statistiken nicht mit). Geschrieben wird nur per SQL, nie aus der App.
create table if not exists public.account_marks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('builder', 'verified', 'official', 'admin', 'test')),
  created_at timestamptz not null default now(),
  primary key (user_id, kind)
);
alter table public.account_marks enable row level security;
drop policy if exists "account_marks_select_public_kinds" on public.account_marks;
create policy "account_marks_select_public_kinds" on public.account_marks
  for select to authenticated using (kind in ('builder', 'verified', 'official'));
revoke insert, update, delete on public.account_marks from anon, authenticated;

create or replace function public.has_account_mark(p_user uuid, p_kind text)
returns boolean language sql security definer stable set search_path = public
as $$ select exists (select 1 from public.account_marks m where m.user_id = p_user and m.kind = p_kind); $$;

create or replace function public.is_app_admin()
returns boolean language sql security definer stable set search_path = public
as $$ select public.has_account_mark(auth.uid(), 'admin'); $$;

create or replace function public.official_account_id()
returns uuid language sql security definer stable set search_path = public
as $$ select user_id from public.account_marks where kind = 'official' limit 1; $$;

grant execute on function public.has_account_mark(uuid, text), public.is_app_admin(), public.official_account_id() to authenticated;

-- Vergabe (einmalig, nach Benutzername)
insert into public.account_marks (user_id, kind)
select p.id, v.kind
from (values
  ('streuselschnecke', 'builder'), ('streuselschnecke', 'admin'),
  ('hörnchen', 'verified'),
  ('uebungswelt', 'official'),
  ('testqa', 'test'), ('testqa2', 'test'), ('bugfixtester3', 'test'), ('wikitester', 'test'), ('reacttester', 'test'),
  ('qatestera', 'test'), ('qatesterb', 'test'), ('logotestuser', 'test'), ('uebungswelt', 'test'), ('geloescht', 'test')
) as v(username, kind)
join public.profiles p on lower(p.username) = v.username
on conflict do nothing;

-- Einbahn-Freundschaft: Das offizielle Konto sieht über Freundschaften nichts von anderen (Redaktion, Charaktere …);
-- alle anderen sehen seine Beiträge und können ihm schreiben.
create or replace function public.is_friend_of(_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
    and ((f.requester_id = auth.uid() and f.addressee_id = _user_id)
      or (f.requester_id = _user_id and f.addressee_id = auth.uid()))
  ) and not public.has_account_mark(auth.uid(), 'official');
$$;

-- Jedes Konto ist mit dem offiziellen Konto befreundet (nicht lösbar)
create or replace function public.befriend_official_account(p_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare v_off uuid := public.official_account_id();
begin
  if v_off is null or p_user = v_off then return; end if;
  if exists (select 1 from public.profiles p where p.id = p_user and lower(p.username) in ('geloescht')) then return; end if;
  if exists (
    select 1 from public.friendships f
    where (f.requester_id = p_user and f.addressee_id = v_off) or (f.requester_id = v_off and f.addressee_id = p_user)
  ) then
    update public.friendships f set status = 'accepted'
    where status <> 'accepted' and ((f.requester_id = p_user and f.addressee_id = v_off) or (f.requester_id = v_off and f.addressee_id = p_user));
  else
    insert into public.friendships (requester_id, addressee_id, status) values (p_user, v_off, 'accepted');
  end if;
end;
$$;
revoke all on function public.befriend_official_account(uuid) from public, anon, authenticated;

create or replace function public.profiles_befriend_official()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.befriend_official_account(new.id);
  return new;
end;
$$;
revoke all on function public.profiles_befriend_official() from public, anon, authenticated;
drop trigger if exists profiles_befriend_official_trg on public.profiles;
create trigger profiles_befriend_official_trg after insert on public.profiles
  for each row execute function public.profiles_befriend_official();

-- Bestehende Konten nachtragen
select public.befriend_official_account(p.id) from public.profiles p;

-- Die Freundschaft mit dem offiziellen Konto lässt sich nicht beenden
drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships
  for delete to authenticated using (
    auth.uid() in (requester_id, addressee_id)
    and not public.has_account_mark(requester_id, 'official')
    and not public.has_account_mark(addressee_id, 'official')
  );

-- Beiträge „als Wortwinkel“: App-Admins dürfen Redaktions-Beiträge des offiziellen Kontos anlegen, ändern und löschen
drop policy if exists "redaktion_posts_insert_own" on public.redaktion_posts;
create policy "redaktion_posts_insert_own" on public.redaktion_posts
  for insert to authenticated with check (
    author_id = auth.uid() or (public.is_app_admin() and public.has_account_mark(author_id, 'official'))
  );
drop policy if exists "redaktion_posts_update_own" on public.redaktion_posts;
create policy "redaktion_posts_update_own" on public.redaktion_posts
  for update to authenticated using (
    author_id = auth.uid() or (public.is_app_admin() and public.has_account_mark(author_id, 'official'))
  );
drop policy if exists "redaktion_posts_delete_own" on public.redaktion_posts;
create policy "redaktion_posts_delete_own" on public.redaktion_posts
  for delete to authenticated using (
    author_id = auth.uid() or (public.is_app_admin() and public.has_account_mark(author_id, 'official'))
  );

-- „Zuletzt gesehen“ je Konto (Überblick: online jetzt, aktiv heute/Woche/Monat)
alter table public.profiles add column if not exists last_seen_at timestamptz;
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public
as $$ update public.profiles set last_seen_at = now() where id = auth.uid(); $$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

notify pgrst, 'reload schema';
