-- Meldungen (Tickets): Mitglieder melden Fehler, Wünsche und Fragen, die Betreiberin (App-Admin) bearbeitet sie.
-- Jede:r sieht nur die eigenen Meldungen; Anlegen und Statuswechsel laufen nur über Funktionen.
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bug', 'wish', 'question')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 4000),
  status text not null default 'open' check (status in ('open', 'working', 'done', 'declined')),
  page_path text check (page_path is null or char_length(page_path) <= 300),
  device text check (device is null or char_length(device) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists tickets_creator_idx on public.tickets (created_by, created_at desc);
create index if not exists tickets_status_idx on public.tickets (status, created_at desc);
alter table public.tickets enable row level security;
revoke all on table public.tickets from anon, authenticated;
grant select on table public.tickets to authenticated;
do $$ begin
  create policy tickets_select on public.tickets for select to authenticated using (created_by = auth.uid() or public.is_app_admin());
exception when duplicate_object then null; end $$;

-- Melden (höchstens 10 pro Stunde je Konto)
create or replace function public.create_ticket(p_kind text, p_title text, p_body text, p_page text, p_device text) returns uuid
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
  if (select count(*) from public.tickets where created_by = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Zu viele Meldungen. Versuch es später noch einmal.';
  end if;
  insert into public.tickets (created_by, kind, title, body, page_path, device)
  values (auth.uid(), p_kind, left(trim(p_title), 120), left(trim(coalesce(p_body, '')), 4000), nullif(left(trim(coalesce(p_page, '')), 300), ''), nullif(left(trim(coalesce(p_device, '')), 400), ''))
  returning id into v;
  return v;
end $$;
revoke all on function public.create_ticket(text, text, text, text, text) from public, anon;
grant execute on function public.create_ticket(text, text, text, text, text) to authenticated;

-- Status setzen (nur App-Admin); gibt Melder:in und Titel für die Benachrichtigung zurück
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
     set status = p_status, updated_at = now(), closed_at = case when p_status in ('done', 'declined') then now() else null end
   where id = p_id
   returning * into t;
  if not found then
    raise exception 'Diese Meldung gibt es nicht.';
  end if;
  return jsonb_build_object('created_by', t.created_by, 'title', t.title, 'status', t.status);
end $$;
revoke all on function public.set_ticket_status(uuid, text) from public, anon;
grant execute on function public.set_ticket_status(uuid, text) to authenticated;

-- Wer bekommt die Meldung „neue Meldung“? Nur, wenn die aufrufende Person gerade selbst eine angelegt hat (kein Ausforschen der Admins).
create or replace function public.ticket_admin_recipients() returns setof uuid
language sql stable security definer set search_path = public as $$
  select m.user_id
  from public.account_marks m
  where m.kind = 'admin'
    and m.user_id <> auth.uid()
    and exists (select 1 from public.tickets t where t.created_by = auth.uid() and t.created_at > now() - interval '10 minutes');
$$;
revoke all on function public.ticket_admin_recipients() from public, anon;
grant execute on function public.ticket_admin_recipients() to authenticated;

notify pgrst, 'reload schema';
