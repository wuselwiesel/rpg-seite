-- Meldungen, Teil 2: Ticketnummern, Screenshots (privater Speicher), Kommentare mit internen Notizen, Ungelesen-Stand und Live-Aktualisierung.
alter table public.tickets add column if not exists number bigint generated always as identity;
create unique index if not exists tickets_number_idx on public.tickets (number);
alter table public.tickets add column if not exists last_actor uuid references public.profiles (id) on delete set null;
alter table public.tickets add column if not exists images text[] not null default '{}';
alter table public.tickets drop constraint if exists tickets_images_max;
alter table public.tickets add constraint tickets_images_max check (cardinality(images) <= 4);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  images text[] not null default '{}' check (cardinality(images) <= 4),
  internal boolean not null default false,
  created_at timestamptz not null default now(),
  check (char_length(body) > 0 or cardinality(images) > 0)
);
create index if not exists ticket_comments_ticket_idx on public.ticket_comments (ticket_id, created_at);
alter table public.ticket_comments enable row level security;
revoke all on table public.ticket_comments from anon, authenticated;
grant select on table public.ticket_comments to authenticated;
do $$ begin
  create policy ticket_comments_select on public.ticket_comments for select to authenticated using (
    public.is_app_admin() or (not internal and exists (select 1 from public.tickets t where t.id = ticket_id and t.created_by = auth.uid()))
  );
exception when duplicate_object then null; end $$;

create table if not exists public.ticket_reads (
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);
alter table public.ticket_reads enable row level security;
revoke all on table public.ticket_reads from anon, authenticated;
grant select on table public.ticket_reads to authenticated;
do $$ begin
  create policy ticket_reads_select on public.ticket_reads for select to authenticated using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Bilder gehören in den eigenen Ordner des Speichers (<user-id>/…), höchstens 4
create or replace function public._ticket_images_ok(p_images text[]) returns boolean
language sql immutable as $$
  select cardinality(coalesce(p_images, '{}')) <= 4
     and not exists (
       select 1 from unnest(coalesce(p_images, '{}')) i
       where i not like auth.uid()::text || '/%' or i ~ '\.\.' or char_length(i) > 200
     );
$$;

-- Die erste Fassung von create_ticket (ohne Bilder) ist stillgelegt; der MCP erlaubt kein DROP, daher umbenannt und ohne Rechte
do $$ begin
  if exists (select 1 from pg_proc where proname = 'create_ticket' and pg_get_function_identity_arguments(oid) = 'p_kind text, p_title text, p_body text, p_page text, p_device text') then
    revoke all on function public.create_ticket(text, text, text, text, text) from public, anon, authenticated;
    alter function public.create_ticket(text, text, text, text, text) rename to create_ticket_v1_unused;
  end if;
end $$;

-- Melden mit Bildern (höchstens 10 pro Stunde je Konto)
create or replace function public.create_ticket(p_kind text, p_title text, p_body text, p_page text, p_device text, p_images text[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if p_kind not in ('bug', 'wish', 'question') then
    raise exception 'Unbekannte Art.';
  end if;
  if char_length(trim(coalesce(p_title, ''))) = 0 then
    raise exception 'Der Titel fehlt.';
  end if;
  if not public._ticket_images_ok(p_images) then
    raise exception 'Die Bilder sind ungültig.';
  end if;
  if (select count(*) from public.tickets where created_by = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Zu viele Meldungen. Versuch es später noch einmal.';
  end if;
  insert into public.tickets (created_by, kind, title, body, page_path, device, images, last_actor)
  values (auth.uid(), p_kind, left(trim(p_title), 120), left(trim(coalesce(p_body, '')), 4000), nullif(left(trim(coalesce(p_page, '')), 300), ''), nullif(left(trim(coalesce(p_device, '')), 400), ''), coalesce(p_images, '{}'), auth.uid())
  returning id into v;
  return v;
end $$;
revoke all on function public.create_ticket(text, text, text, text, text, text[]) from public, anon;
grant execute on function public.create_ticket(text, text, text, text, text, text[]) to authenticated;

-- Status setzen (nur App-Admin); gibt Melder:in, Titel und Nummer für die Benachrichtigung zurück
create or replace function public.set_ticket_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets;
begin
  if not public.is_app_admin() then
    raise exception 'Das darf nur die Betreiberin.';
  end if;
  if p_status not in ('open', 'working', 'done', 'declined') then
    raise exception 'Unbekannter Status.';
  end if;
  update public.tickets
     set status = p_status, updated_at = now(), last_actor = auth.uid(), closed_at = case when p_status in ('done', 'declined') then now() else null end
   where id = p_id
   returning * into t;
  if not found then
    raise exception 'Diese Meldung gibt es nicht.';
  end if;
  return jsonb_build_object('created_by', t.created_by, 'title', t.title, 'number', t.number, 'status', t.status);
end $$;

-- Kommentar: Melder:in an der eigenen Meldung (öffnet Erledigtes wieder), App-Admin an jeder (optional intern; intern ändert den Stand der Meldung nicht)
create or replace function public.add_ticket_comment(p_ticket uuid, p_body text, p_images text[], p_internal boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets; admin boolean := public.is_app_admin(); intern boolean;
begin
  select * into t from public.tickets where id = p_ticket;
  if not found or (not admin and t.created_by <> auth.uid()) then
    raise exception 'Diese Meldung gibt es nicht.';
  end if;
  if char_length(trim(coalesce(p_body, ''))) = 0 and cardinality(coalesce(p_images, '{}')) = 0 then
    raise exception 'Der Kommentar ist leer.';
  end if;
  if not public._ticket_images_ok(p_images) then
    raise exception 'Die Bilder sind ungültig.';
  end if;
  if (select count(*) from public.ticket_comments where author_id = auth.uid() and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Zu viele Kommentare. Versuch es später noch einmal.';
  end if;
  intern := admin and coalesce(p_internal, false);
  insert into public.ticket_comments (ticket_id, author_id, body, images, internal)
  values (p_ticket, auth.uid(), left(trim(coalesce(p_body, '')), 2000), coalesce(p_images, '{}'), intern);
  if not intern then
    update public.tickets
       set updated_at = now(), last_actor = auth.uid(),
           status = case when not admin and status in ('done', 'declined') then 'open' else status end,
           closed_at = case when not admin and status in ('done', 'declined') then null else closed_at end
     where id = p_ticket;
  end if;
  return jsonb_build_object('created_by', t.created_by, 'title', t.title, 'number', t.number, 'by_admin', admin, 'internal', intern);
end $$;
revoke all on function public.add_ticket_comment(uuid, text, text[], boolean) from public, anon;
grant execute on function public.add_ticket_comment(uuid, text, text[], boolean) to authenticated;

create or replace function public.mark_ticket_read(p_ticket uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.ticket_reads (ticket_id, user_id, read_at)
  select t.id, auth.uid(), now() from public.tickets t
   where t.id = p_ticket and auth.uid() is not null and (t.created_by = auth.uid() or public.is_app_admin())
  on conflict (ticket_id, user_id) do update set read_at = now();
$$;
revoke all on function public.mark_ticket_read(uuid) from public, anon;
grant execute on function public.mark_ticket_read(uuid) to authenticated;

-- Zahl ungelesener Meldungen: zuletzt hat jemand anderes etwas getan und ich habe es noch nicht geöffnet
create or replace function public.ticket_unread_count() returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer
    from public.tickets t
    left join public.ticket_reads r on r.ticket_id = t.id and r.user_id = auth.uid()
   where auth.uid() is not null
     and (t.created_by = auth.uid() or public.is_app_admin())
     and t.last_actor is distinct from auth.uid()
     and (r.read_at is null or r.read_at < t.updated_at);
$$;
revoke all on function public.ticket_unread_count() from public, anon;
grant execute on function public.ticket_unread_count() to authenticated;

-- Empfänger „neue Meldung / neue Antwort“: nur, wenn die aufrufende Person gerade selbst eine Meldung oder einen Kommentar geschrieben hat
create or replace function public.ticket_admin_recipients() returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.user_id
  from public.account_marks m
  where m.kind = 'admin'
    and m.user_id <> auth.uid()
    and (
      exists (select 1 from public.tickets t where t.created_by = auth.uid() and t.created_at > now() - interval '10 minutes')
      or exists (select 1 from public.ticket_comments c where c.author_id = auth.uid() and c.created_at > now() - interval '10 minutes')
    );
$$;

-- Live-Aktualisierung (Statuswechsel, neue Antworten); die Zeilenrechte gelten auch hier
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.ticket_comments;

-- Speicher für Screenshots: privat, jede:r schreibt nur in den eigenen Ordner, lesen dürfen Besitzer:in und App-Admins (signierte Links)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-files', 'ticket-files', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;
drop policy if exists "ticket_files_read" on storage.objects;
create policy "ticket_files_read" on storage.objects
  for select to authenticated using (bucket_id = 'ticket-files' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_app_admin()));
drop policy if exists "ticket_files_insert" on storage.objects;
create policy "ticket_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'ticket-files' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
