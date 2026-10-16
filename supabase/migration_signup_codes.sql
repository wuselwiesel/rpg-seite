-- Registrierung nur mit Einladungscode: Die Betreiberin (App-Admin) erzeugt Codes, ohne gültigen Code legt die Datenbank kein neues Konto an.
-- Die Sperre sitzt im Trigger auf auth.users (greift nur für Anmeldungen über den Auth-Dienst), also auch bei direkten Aufrufen mit dem öffentlichen Schlüssel.
create table if not exists public.signup_codes (
  code text primary key check (code ~ '^[A-Z0-9]{8,32}$'),
  label text not null default '' check (char_length(label) <= 60),
  max_uses integer not null default 1 check (max_uses between 1 and 1000),
  uses integer not null default 0 check (uses >= 0),
  active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.signup_codes enable row level security;
revoke all on table public.signup_codes from anon, authenticated;
grant select on table public.signup_codes to authenticated;
do $$ begin
  create policy signup_codes_select_admin on public.signup_codes for select to authenticated using (public.is_app_admin());
exception when duplicate_object then null; end $$;

create or replace function public.normalize_signup_code(p_code text) returns text
language sql immutable as $$ select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); $$;

-- Gültig und noch nicht aufgebraucht? (verbraucht nichts; auch vor der Anmeldung nutzbar, für eine klare Fehlermeldung)
create or replace function public.signup_code_valid(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.signup_codes c where c.code = public.normalize_signup_code(p_code) and c.active and c.uses < c.max_uses);
$$;
revoke all on function public.signup_code_valid(text) from public;
grant execute on function public.signup_code_valid(text) to anon, authenticated;

create or replace function public.create_signup_code(p_label text, p_max_uses integer) returns text
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.is_app_admin() then
    raise exception 'Das darf nur die Betreiberin.';
  end if;
  v := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.signup_codes (code, label, max_uses, created_by)
  values (v, left(trim(coalesce(p_label, '')), 60), greatest(1, least(coalesce(p_max_uses, 1), 1000)), auth.uid());
  return v;
end $$;
revoke all on function public.create_signup_code(text, integer) from public, anon;
grant execute on function public.create_signup_code(text, integer) to authenticated;

create or replace function public.set_signup_code_active(p_code text, p_active boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then
    raise exception 'Das darf nur die Betreiberin.';
  end if;
  update public.signup_codes set active = p_active where code = p_code;
end $$;
revoke all on function public.set_signup_code_active(text, boolean) from public, anon;
grant execute on function public.set_signup_code_active(text, boolean) to authenticated;

-- Sperre: Neue Konten, die der Auth-Dienst anlegt, brauchen einen gültigen Code (wird dabei verbraucht und nicht im Profil-Datensatz gespeichert).
-- Konten, die per SQL angelegt werden (z. B. das Wortwinkel-Konto), sind nicht betroffen.
create or replace function public.enforce_signup_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if session_user <> 'supabase_auth_admin' then
    return new;
  end if;
  v := public.normalize_signup_code(new.raw_user_meta_data ->> 'signup_code');
  update public.signup_codes set uses = uses + 1 where code = v and active and uses < max_uses;
  if not found then
    raise exception 'Einladungscode ungültig oder aufgebraucht';
  end if;
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'signup_code';
  return new;
end $$;
revoke all on function public.enforce_signup_code() from public, anon, authenticated;

-- Der Trigger wird zuletzt eingeschaltet (erst wenn die Anmeldeseite den Code abfragt):
-- create trigger enforce_signup_code_trg before insert on auth.users for each row execute function public.enforce_signup_code();

notify pgrst, 'reload schema';
