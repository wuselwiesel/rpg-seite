-- Chat starten auch vom offiziellen Wortwinkel-Konto: is_friend_of zählt dort absichtlich keine Freundschaften,
-- die Liste „Neuer Chat mit“ bietet die Freund:innen aber an (Folge: 404). Hier wird die Freundschaft direkt geprüft.
create or replace function public.start_account_chat(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  v_chat uuid;
  v_allowed boolean;
begin
  if v_me is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Ungültige Person.';
  end if;
  v_allowed := exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = v_me and f.addressee_id = p_other) or (f.requester_id = p_other and f.addressee_id = v_me))
  ) or exists (
    select 1 from public.world_join_requests r
    where r.status = 'pending'
      and (
        (r.user_id = v_me and (
          exists (select 1 from public.worlds w where w.id = r.world_id and w.created_by = p_other)
          or exists (select 1 from public.world_members m where m.world_id = r.world_id and m.user_id = p_other and m.role = 'admin')
        ))
        or (r.user_id = p_other and public.is_world_admin(r.world_id))
      )
  );
  if not v_allowed then
    raise exception 'Nur mit Freund:innen möglich.';
  end if;

  select c.id into v_chat
  from public.account_chats c
  where c.kind = 'direct'
    and exists (select 1 from public.account_chat_participants a where a.chat_id = c.id and a.user_id = v_me)
    and exists (select 1 from public.account_chat_participants b where b.chat_id = c.id and b.user_id = p_other)
    and (select count(*) from public.account_chat_participants x where x.chat_id = c.id) = 2
  limit 1;

  if v_chat is null then
    insert into public.account_chats (created_by) values (v_me) returning id into v_chat;
    insert into public.account_chat_participants (chat_id, user_id) values (v_chat, v_me), (v_chat, p_other);
  end if;

  return v_chat;
end;
$function$;
