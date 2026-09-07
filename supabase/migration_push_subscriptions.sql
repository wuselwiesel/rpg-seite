-- Migration: Web-Push-Abos für echte Browser-Benachrichtigungen
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Security-definer Helfer, damit ein Server Action beim Erzeugen einer
-- Benachrichtigung (z.B. Like von Charakter A für Charakter B) auch die
-- Push-Abos der Zielperson lesen/aufräumen kann, obwohl RLS diese sonst
-- auf die jeweils eigene user_id beschränkt - analog zu create_notification.
create or replace function public.get_push_subscriptions(p_user_id uuid)
returns table(endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
stable
as $$
  select endpoint, p256dh, auth from public.push_subscriptions where user_id = p_user_id;
$$;

grant execute on function public.get_push_subscriptions(uuid) to authenticated;

create or replace function public.delete_stale_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint;
$$;

grant execute on function public.delete_stale_push_subscription(text) to authenticated;
