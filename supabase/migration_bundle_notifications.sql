-- Benachrichtigungen bündeln: mehrere Kommentare, Story-Likes und Reaktionen auf dasselbe Ziel, solange die
-- vorige noch ungelesen ist, ergeben eine Benachrichtigung ("X und 4 weitere ..."). Gefällt-mir-Meldungen
-- wurden schon vorher gebündelt (migration_like_notifications.sql); diese Funktion übernimmt das und erweitert es.
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_actor_name text,
  p_actor_avatar_url text,
  p_link text,
  p_message text,
  p_recipient_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_type = 'like' then
    insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name, actor_count)
    values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name, 1)
    on conflict (user_id, link, type, message) where (type = 'like' and read_at is null)
    do update set
      actor_name = excluded.actor_name,
      actor_avatar_url = excluded.actor_avatar_url,
      recipient_name = excluded.recipient_name,
      actor_count = case
        when public.notifications.actor_name = excluded.actor_name then public.notifications.actor_count
        else public.notifications.actor_count + 1
      end,
      created_at = now();
  elsif p_type in ('story_like', 'comment', 'redaktion_comment', 'redaktion_reaction') then
    -- Reaktionen mit unterschiedlichem Emoji gehören zusammen; die Meldung wird dann allgemein.
    update public.notifications n set
      actor_name = p_actor_name,
      actor_avatar_url = p_actor_avatar_url,
      recipient_name = p_recipient_name,
      actor_count = case when n.actor_name = p_actor_name then n.actor_count else n.actor_count + 1 end,
      message = case
        when n.type = 'redaktion_reaction' and n.message <> p_message then 'hat auf deinen Redaktions-Beitrag reagiert'
        else n.message
      end,
      created_at = now()
    where n.id = (
      select id from public.notifications
      where user_id = p_user_id and link = p_link and type = p_type and read_at is null
        and (p_type = 'redaktion_reaction' or message = p_message)
      order by created_at desc
      limit 1
    )
    returning n.id into v_id;
    if v_id is null then
      insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name, actor_count)
      values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name, 1);
    end if;
  else
    insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name)
    values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name);
  end if;
end;
$$;

notify pgrst, 'reload schema';
