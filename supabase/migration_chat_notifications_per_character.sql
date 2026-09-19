-- Migration: Chat-Benachrichtigungen pro angeschriebenem Charakter
-- Nur Charaktere, die eine Nachricht bekommen, werden benachrichtigt
-- ("<Absender> hat dir eine Nachricht geschickt"). Der Link enthält den
-- Empfänger-Charakter (?as=), damit ein Klick auf die Benachrichtigung
-- automatisch zu diesem Charakter wechselt und den Chat öffnet.

alter table public.notifications add column if not exists recipient_name text;

-- Alte, uneindeutige Chat-Benachrichtigungen ("A hat B geschrieben") entfernen.
delete from public.notifications where type = 'chat_message';

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  sender_avatar text;
begin
  select name, avatar_url into sender_name, sender_avatar
  from public.characters where id = new.character_id;

  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name, created_at, read_at)
  select c.owner_id, 'chat_message', sender_name, sender_avatar,
    '/chats/' || new.chat_id || '?as=' || c.id,
    'hat dir eine Nachricht geschickt',
    c.name,
    new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and cp.character_id <> new.character_id
  on conflict (user_id, link) where (type = 'chat_message')
  do update set
    actor_name = excluded.actor_name,
    actor_avatar_url = excluded.actor_avatar_url,
    message = excluded.message,
    recipient_name = excluded.recipient_name,
    created_at = excluded.created_at,
    read_at = null;

  return new;
end;
$$;
