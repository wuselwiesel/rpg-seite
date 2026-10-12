-- Sicherheit und Tempo (12. Oktober 2026), nach der Supabase-Prüfung (Advisors)

-- 1) Funktionen ohne Login nicht mehr aufrufbar. Offen bleiben nur Registrierung (username_available),
--    Login (get_email_for_username), Cron (digest_due) und die Funktionen des Hundeplans (anderes Projekt).
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.username_available(text, uuid) to anon;
grant execute on function public.digest_due(text) to anon;
grant execute on function public.get_email_for_username(text) to anon;
grant execute on function public.get_email_for_username(text, text) to anon;
grant execute on function public.hundeplan_get(text, text[]) to anon;
grant execute on function public.hundeplan_set(text, text, text, boolean, text) to anon;
grant execute on function public.hundeplan_set_v2(text, text, text, boolean, text, timestamptz) to anon;

-- Trigger-Funktionen sind nie als Funktionsaufruf (RPC) gedacht; Trigger laufen auch ohne EXECUTE-Recht.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

alter function public.worlds_keep_owner() set search_path = public;

-- 2) Zugriffsregeln: auth.uid() nur einmal je Abfrage statt je Zeile auswerten.
do $$
declare
  r record;
  q text;
  c text;
  cmd text;
begin
  for r in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') ~* '(?<!select )auth\.(uid|role|jwt)\(\)' or coalesce(with_check, '') ~* '(?<!select )auth\.(uid|role|jwt)\(\)')
  loop
    q := regexp_replace(r.qual, '(?<!select )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'gi');
    c := regexp_replace(r.with_check, '(?<!select )auth\.(uid|role|jwt)\(\)', '(select auth.\1())', 'gi');
    cmd := format('alter policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    if q is not null then cmd := cmd || ' using (' || q || ')'; end if;
    if c is not null then cmd := cmd || ' with check (' || c || ')'; end if;
    execute cmd;
  end loop;
end $$;

-- 3) Index für Fremdschlüssel, die noch keinen haben (beschleunigt Löschen und Verknüpfungen)
do $$
declare
  r record;
  idx text;
begin
  for r in
    select c.conrelid, c.conrelid::regclass::text as tbl, c.conkey, c.conname,
      (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
         from unnest(c.conkey) with ordinality k(attnum, ord)
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
      )
  loop
    idx := left(r.conname || '_idx', 63);
    execute format('create index if not exists %I on %s (%s)', idx, r.tbl, r.cols);
  end loop;
end $$;

notify pgrst, 'reload schema';
