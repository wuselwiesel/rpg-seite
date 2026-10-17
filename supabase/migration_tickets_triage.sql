-- Tickets: „dringend“ (nur die Betreiberin setzt es) und eine optionale Kategorie (Melder:in beim Melden, Betreiberin danach).
alter table public.tickets add column if not exists urgent boolean not null default false;
alter table public.tickets add column if not exists category text;
do $$ begin
  alter table public.tickets add constraint tickets_category_check
    check (category is null or category in ('scene', 'wiki', 'chat', 'cast', 'character', 'feed', 'settings', 'other'));
exception when duplicate_object then null; end $$;

-- Die Fassung mit Bildern, aber ohne Kategorie, ist stillgelegt (kein DROP über den MCP: umbenannt, ohne Rechte)
do $$ begin
  if exists (select 1 from pg_proc where proname = 'create_ticket' and pg_get_function_identity_arguments(oid) = 'p_kind text, p_title text, p_body text, p_page text, p_device text, p_images text[]') then
    revoke all on function public.create_ticket(text, text, text, text, text, text[]) from public, anon, authenticated;
    alter function public.create_ticket(text, text, text, text, text, text[]) rename to create_ticket_v2_unused;
  end if;
end $$;

create or replace function public.create_ticket(p_kind text, p_title text, p_body text, p_page text, p_device text, p_images text[], p_category text) returns uuid
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
  if p_category is not null and p_category not in ('scene', 'wiki', 'chat', 'cast', 'character', 'feed', 'settings', 'other') then
    raise exception 'Unbekannte Kategorie.';
  end if;
  if not public._ticket_images_ok(p_images) then
    raise exception 'Die Bilder sind ungültig.';
  end if;
  if (select count(*) from public.tickets where created_by = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Zu viele Meldungen. Versuch es später noch einmal.';
  end if;
  insert into public.tickets (created_by, kind, title, body, page_path, device, images, last_actor, category)
  values (auth.uid(), p_kind, left(trim(p_title), 120), left(trim(coalesce(p_body, '')), 4000), nullif(left(trim(coalesce(p_page, '')), 300), ''), nullif(left(trim(coalesce(p_device, '')), 400), ''), coalesce(p_images, '{}'), auth.uid(), p_category)
  returning id into v;
  return v;
end $$;
revoke all on function public.create_ticket(text, text, text, text, text, text[], text) from public, anon;
grant execute on function public.create_ticket(text, text, text, text, text, text[], text) to authenticated;

-- Einordnen (nur App-Admin): dringend und Kategorie; ändert weder „zuletzt aktiv“ noch Ungelesen-Stände
create or replace function public.set_ticket_triage(p_id uuid, p_urgent boolean, p_category text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_app_admin() then
    raise exception 'Das darf nur die Betreiberin.';
  end if;
  if p_category is not null and p_category not in ('scene', 'wiki', 'chat', 'cast', 'character', 'feed', 'settings', 'other') then
    raise exception 'Unbekannte Kategorie.';
  end if;
  update public.tickets set urgent = coalesce(p_urgent, false), category = p_category where id = p_id;
  if not found then
    raise exception 'Diese Meldung gibt es nicht.';
  end if;
end $$;
revoke all on function public.set_ticket_triage(uuid, boolean, text) from public, anon;
grant execute on function public.set_ticket_triage(uuid, boolean, text) to authenticated;

-- Verlauf: Statuswechsel und Zusammenführen stehen als Zeilen im Verlauf (system = 'status' oder 'merge'; body trägt den Namen des Stands bzw. die Nummer)
alter table public.ticket_comments add column if not exists system text;
do $$ begin
  alter table public.ticket_comments add constraint ticket_comments_system_check check (system is null or system in ('status', 'merge'));
exception when duplicate_object then null; end $$;
alter table public.tickets add column if not exists merged_into uuid references public.tickets (id) on delete set null;

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
  insert into public.ticket_comments (ticket_id, author_id, body, system)
  values (p_id, auth.uid(), case p_status when 'open' then 'Offen' when 'working' then 'In Arbeit' when 'done' then 'Erledigt' else 'Abgelehnt' end, 'status');
  return jsonb_build_object('created_by', t.created_by, 'title', t.title, 'number', t.number, 'status', t.status);
end $$;

-- Doppelte Meldung einer anderen zuordnen (nur App-Admin): wird abgelehnt und verweist auf die Hauptmeldung
create or replace function public.merge_ticket(p_id uuid, p_into_number bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t public.tickets; target public.tickets;
begin
  if not public.is_app_admin() then
    raise exception 'Das darf nur die Betreiberin.';
  end if;
  select * into target from public.tickets where number = p_into_number;
  if not found then
    raise exception 'Ein Ticket mit dieser Nummer gibt es nicht.';
  end if;
  if target.id = p_id then
    raise exception 'Ein Ticket lässt sich nicht mit sich selbst zusammenführen.';
  end if;
  if target.merged_into is not null then
    raise exception 'Dieses Ticket ist selbst schon zusammengeführt. Nimm das Hauptticket.';
  end if;
  update public.tickets
     set status = 'declined', closed_at = now(), updated_at = now(), last_actor = auth.uid(), merged_into = target.id
   where id = p_id
   returning * into t;
  if not found then
    raise exception 'Diese Meldung gibt es nicht.';
  end if;
  insert into public.ticket_comments (ticket_id, author_id, body, system)
  values (p_id, auth.uid(), '#' || target.number, 'merge');
  return jsonb_build_object('created_by', t.created_by, 'title', t.title, 'number', t.number, 'into_number', target.number);
end $$;
revoke all on function public.merge_ticket(uuid, bigint) from public, anon;
grant execute on function public.merge_ticket(uuid, bigint) to authenticated;

notify pgrst, 'reload schema';
