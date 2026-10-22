-- Gruppen-Admins (wie bei WhatsApp): die Ersteller:in ist Admin (solange sie Mitglied ist), sie und andere Admins ernennen weitere Admins.
-- Admins fügen Mitglieder hinzu und entfernen sie und ändern Name und Bild der Gruppe. Die Ersteller:in lässt sich von anderen Admins nicht entfernen
-- und nicht zum Nicht-Admin machen. Tritt der letzte Admin aus, wird ein verbleibendes Mitglied Admin.
alter table public.chat_participants add column if not exists is_admin boolean not null default false;

create or replace function public.is_chat_admin(p_chat uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.chats ch
    where ch.id = p_chat and ch.created_by = auth.uid()
      and (not exists (select 1 from public.chat_participants x where x.chat_id = p_chat)
           or exists (select 1 from public.chat_participants x join public.characters c on c.id = x.character_id where x.chat_id = p_chat and c.owner_id = auth.uid()))
  ) or exists (
    select 1 from public.chat_participants cp join public.characters c on c.id = cp.character_id
    where cp.chat_id = p_chat and cp.is_admin and c.owner_id = auth.uid()
  );
$$;
revoke all on function public.is_chat_admin(uuid) from public, anon;
grant execute on function public.is_chat_admin(uuid) to authenticated;

-- Mitglieder ändern an der eigenen Zeile nur noch muted und archived; Admin wird man nur über set_chat_admin
revoke update on public.chat_participants from authenticated, anon;
grant update (muted, archived) on public.chat_participants to authenticated;

alter policy chat_participants_insert on public.chat_participants
  with check (
    public.is_chat_admin(chat_id)
    or (public.is_chat_participant(chat_id) and not exists (select 1 from public.chats ch where ch.id = chat_participants.chat_id and ch.is_group))
  );

alter policy chat_participants_delete_creator on public.chat_participants
  using (
    exists (select 1 from public.chats ch where ch.id = chat_participants.chat_id and ch.is_group)
    and public.is_chat_admin(chat_id)
    and (
      exists (select 1 from public.chats ch where ch.id = chat_participants.chat_id and ch.created_by = (select auth.uid()))
      or not exists (select 1 from public.chats ch join public.characters c on c.id = chat_participants.character_id where ch.id = chat_participants.chat_id and c.owner_id = ch.created_by)
    )
  );

alter policy chats_update_participant on public.chats
  using (
    created_by = (select auth.uid())
    or (is_group and public.is_chat_admin(id))
    or ((not is_group) and public.is_chat_participant(id))
  );

create or replace function public.set_chat_admin(p_chat uuid, p_character uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creator uuid;
  v_owner uuid;
  v_name text;
  v_sender uuid;
begin
  if not exists (select 1 from public.chats ch where ch.id = p_chat and ch.is_group) then
    raise exception 'Nur in Gruppen gibt es Admins.';
  end if;
  if not public.is_chat_admin(p_chat) then
    raise exception 'Nur Admins dürfen das.';
  end if;
  select ch.created_by into v_creator from public.chats ch where ch.id = p_chat;
  select c.owner_id, c.name into v_owner, v_name
    from public.chat_participants cp join public.characters c on c.id = cp.character_id
   where cp.chat_id = p_chat and cp.character_id = p_character;
  if v_owner is null then raise exception 'Diese Figur ist nicht in der Gruppe.'; end if;
  if v_owner = v_creator and not p_admin then raise exception 'Wer die Gruppe erstellt hat, bleibt Admin.'; end if;

  update public.chat_participants set is_admin = p_admin where chat_id = p_chat and character_id = p_character;

  select cp.character_id into v_sender
    from public.chat_participants cp join public.characters c on c.id = cp.character_id
   where cp.chat_id = p_chat and c.owner_id = auth.uid() and cp.character_id <> p_character limit 1;
  if v_sender is not null then
    insert into public.messages (chat_id, character_id, content)
    values (p_chat, v_sender, E'⁣⁣' || v_name || case when p_admin then ' ist jetzt Admin' else ' ist kein Admin mehr' end);
  end if;
end;
$$;
revoke all on function public.set_chat_admin(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_chat_admin(uuid, uuid, boolean) to authenticated;

create or replace function public.chat_participants_admin_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.chats ch where ch.id = old.chat_id and ch.is_group)
     and exists (select 1 from public.chat_participants x where x.chat_id = old.chat_id)
     and not exists (
       select 1 from public.chat_participants cp
         join public.characters c on c.id = cp.character_id
         join public.chats ch on ch.id = cp.chat_id
        where cp.chat_id = old.chat_id and (cp.is_admin or c.owner_id = ch.created_by)
     ) then
    update public.chat_participants set is_admin = true
     where chat_id = old.chat_id
       and character_id = (select y.character_id from public.chat_participants y where y.chat_id = old.chat_id order by y.character_id limit 1);
  end if;
  return null;
end;
$$;
revoke all on function public.chat_participants_admin_guard() from public, anon, authenticated;

create or replace trigger chat_participants_admin_guard_trg after delete on public.chat_participants
  for each row execute function public.chat_participants_admin_guard();
