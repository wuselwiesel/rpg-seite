-- Migration: Stille Chats und @-Erwähnungen in Chat-Nachrichten

alter table public.chat_participants add column if not exists muted boolean not null default false;

-- Die eigene Teilnahme (Charakter gehört mir) darf stumm geschaltet werden.
drop policy if exists "chat_participants_update_own" on public.chat_participants;
create policy "chat_participants_update_own" on public.chat_participants
  for update to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

-- Stumme Chats melden sich nur, wenn der Charakter per @[Name](id) erwähnt wird.
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
    case when position('(' || c.id::text || ')' in new.content) > 0
      then 'hat dich in einer Nachricht erwähnt' else 'hat dir eine Nachricht geschickt' end,
    c.name,
    new.created_at, null::timestamptz
  from public.chat_participants cp
  join public.characters c on c.id = cp.character_id
  where cp.chat_id = new.chat_id and cp.character_id <> new.character_id
    and (not cp.muted or position('(' || c.id::text || ')' in new.content) > 0)
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
