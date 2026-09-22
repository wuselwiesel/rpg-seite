-- Gebündelte "Gefällt"-Benachrichtigungen: mehrere Herzen auf denselben Beitrag kurz hintereinander
-- ergeben eine Benachrichtigung ("X und 2 weitere gefällt dein Beitrag") statt vieler einzelner.

alter table public.notifications add column if not exists actor_count integer not null default 1;

create unique index if not exists notifications_like_unique_idx
  on public.notifications (user_id, link, type, message)
  where (type = 'like' and read_at is null);

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
  else
    insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name)
    values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name);
  end if;
end;
$$;

notify pgrst, 'reload schema';
