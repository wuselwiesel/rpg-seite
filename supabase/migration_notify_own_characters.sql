-- Migration: Chat-Benachrichtigungen auch zwischen eigenen Charakteren
-- Vorher wurde nur benachrichtigt, wenn die Empfänger:in ein anderer Account war.
-- Jetzt bekommt jede:r Besitzer:in eine Benachrichtigung für jeden Teilnehmer-Charakter,
-- der nicht der sendende Charakter ist.

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
  select distinct on (c.owner_id) c.owner_id, 'chat_message', sender_name, sender_avatar,
    '/chats/' || new.chat_id,
    case when c.owner_id <> sender_owner then 'hat dir geschrieben' else 'hat ' || c.name || ' geschrieben' end,
    new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and cp.character_id <> new.character_id
  order by c.owner_id, (c.owner_id <> sender_owner) desc
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
