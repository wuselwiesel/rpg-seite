-- Benachrichtigungen nennen den Charakter, für den sie gedacht sind (recipient_name).
alter table public.notifications add column if not exists recipient_name text;

drop function if exists public.create_notification(uuid, text, text, text, text, text);
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
  insert into public.notifications (user_id, type, actor_name, actor_avatar_url, link, message, recipient_name)
  values (p_user_id, p_type, p_actor_name, p_actor_avatar_url, p_link, p_message, p_recipient_name);
end;
$$;

grant execute on function public.create_notification(uuid, text, text, text, text, text, text) to authenticated;
