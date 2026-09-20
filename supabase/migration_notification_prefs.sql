-- Migration: Benachrichtigungs-Einstellungen (pro Welt/Charakter stumm, Nicht stören, tägliche Zusammenfassung)

create table if not exists public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dnd_enabled boolean not null default false,
  dnd_start text not null default '22:00',
  dnd_end text not null default '08:00',
  timezone text not null default 'Europe/Berlin',
  digest_enabled boolean not null default false,
  digest_only boolean not null default false,
  digest_last_sent_at timestamptz,
  muted_world_ids uuid[] not null default '{}',
  muted_character_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

drop policy if exists "notification_prefs_own" on public.notification_prefs;
create policy "notification_prefs_own" on public.notification_prefs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Für den Push-Versand (Server): Einstellungen der Empfänger:in lesen, ohne dass RLS im Weg ist.
create or replace function public.get_notification_prefs(p_user_id uuid)
returns setof public.notification_prefs
language sql
security definer
set search_path = public
stable
as $$
  select * from public.notification_prefs where user_id = p_user_id;
$$;

grant execute on function public.get_notification_prefs(uuid) to authenticated;

-- Geheimnisse (nur über security-definer-Funktionen lesbar; keine Policy = kein direkter Zugriff).
create table if not exists public.app_secrets (
  key text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;

-- Tägliche Zusammenfassung: wer bekommt sie heute? Nur mit dem Cron-Geheimnis aufrufbar.
create or replace function public.digest_due(p_secret text)
returns table(user_id uuid, unread_count integer, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is distinct from (select value from public.app_secrets where key = 'cron') then
    raise exception 'Nicht erlaubt';
  end if;
  return query
  with due as (
    select p.user_id,
      (select count(*)::int from public.notifications n where n.user_id = p.user_id and n.read_at is null) as unread
    from public.notification_prefs p
    where p.digest_enabled
      and (p.digest_last_sent_at is null or p.digest_last_sent_at < now() - interval '20 hours')
  ),
  marked as (
    update public.notification_prefs np set digest_last_sent_at = now()
    from due where np.user_id = due.user_id and due.unread > 0
    returning np.user_id
  )
  select d.user_id, d.unread, s.endpoint, s.p256dh, s.auth
  from due d
  join marked m on m.user_id = d.user_id
  join public.push_subscriptions s on s.user_id = d.user_id;
end;
$$;

grant execute on function public.digest_due(text) to anon, authenticated;
