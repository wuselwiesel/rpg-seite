-- Migration: Benachrichtigungen (neue Nachrichten, Erwähnungen, Freundschaftsanfragen)
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  actor_name text,
  actor_avatar_url text,
  link text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Für Chat-Nachrichten wird pro (Nutzer:in, Chat) nur eine Benachrichtigung
-- aktuell gehalten (Timestamp/Ungelesen-Status wird bei jeder neuen Nachricht
-- aufgefrischt), damit ein aktiver Chat den Verlauf nicht zuspammt.
create unique index if not exists notifications_chat_unique_idx
  on public.notifications (user_id, link)
  where (type = 'chat_message');

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- Security-definer Helfer zum kontrollierten Anlegen einer Benachrichtigung für
-- eine andere Person (Erwähnung/Freundschaftsanfrage), ohne dass normale
-- Nutzer:innen ein direktes Insert-Recht auf fremde Zeilen brauchen.
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_name text,
  p_actor_avatar_url text,
  p_link text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message)
  values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message);
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, text, text) to authenticated;

-- Neue Chat-Nachrichten lösen automatisch eine Benachrichtigung für alle
-- anderen Teilnehmer:innen aus - unabhängig davon, ob die Nachricht über eine
-- Server Action oder direkt clientseitig eingefügt wurde.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_owner uuid;
  sender_name text;
  sender_avatar text;
begin
  select owner_id, name, avatar_url into sender_owner, sender_name, sender_avatar
  from public.characters where id = new.character_id;

  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, created_at, read_at)
  select distinct c.owner_id, 'chat_message', sender_name, sender_avatar,
    '/chats/' || new.chat_id, 'hat dir geschrieben', new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and c.owner_id <> sender_owner
  on conflict (user_id, link) where (type = 'chat_message')
  do update set
    actor_name = excluded.actor_name,
    actor_avatar_url = excluded.actor_avatar_url,
    message = excluded.message,
    created_at = excluded.created_at,
    read_at = null;

  return new;
end;
$$;

drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify
  after insert on public.messages
  for each row execute procedure public.notify_new_message();

alter publication supabase_realtime add table public.notifications;
