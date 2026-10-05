-- Migration: Welt-Chat und Gruppenchats im Redaktions-Chat
-- * kind: 'direct' (1:1, wie bisher), 'group' (frei angelegt, Name + Mitglieder), 'world' (ein Chat pro Welt).
-- * Der Welt-Chat wird automatisch angelegt; seine Mitglieder sind genau die Mitglieder der Welt
--   (Trigger auf world_members). Name und Bild kommen live aus der Welt.
-- * Gruppen: die Ersteller:in legt an (nur mit Freund:innen), benennt um, fügt hinzu und entfernt;
--   jede:r kann selbst gehen. Verlässt die Ersteller:in die Gruppe, wird die am längsten dabei Seiende zur Verwalter:in.

alter table public.account_chats add column if not exists kind text not null default 'direct';
alter table public.account_chats add column if not exists name text;
alter table public.account_chats add column if not exists avatar_url text;
alter table public.account_chats add column if not exists world_id uuid references public.worlds (id) on delete cascade;
alter table public.account_chat_participants add column if not exists joined_at timestamptz not null default now();

alter table public.account_chats drop constraint if exists account_chats_kind_check;
alter table public.account_chats add constraint account_chats_kind_check check (kind in ('direct', 'group', 'world'));
alter table public.account_chats drop constraint if exists account_chats_world_shape;
alter table public.account_chats add constraint account_chats_world_shape check ((kind = 'world') = (world_id is not null));
alter table public.account_chats drop constraint if exists account_chats_name_length;
alter table public.account_chats add constraint account_chats_name_length check (name is null or char_length(name) between 1 and 60);

create unique index if not exists account_chats_world_uidx on public.account_chats (world_id) where kind = 'world';

-- 1:1-Chats dürfen nicht mit einer (zufällig zweiköpfigen) Gruppe verwechselt werden.
create or replace function public.start_account_chat(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_chat uuid;
begin
  if v_me is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if p_other is null or p_other = v_me then
    raise exception 'Ungültige Person.';
  end if;
  if not public.is_friend_of(p_other) then
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
$$;

-- Welt-Chat: legt ihn bei Bedarf an (nur intern, von den Triggern genutzt).
create or replace function public.ensure_world_chat(p_world uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat uuid;
  v_owner uuid;
begin
  select id into v_chat from public.account_chats where kind = 'world' and world_id = p_world;
  if v_chat is not null then
    return v_chat;
  end if;
  select created_by into v_owner from public.worlds where id = p_world;
  if v_owner is null then
    return null;
  end if;
  insert into public.account_chats (created_by, kind, world_id)
  values (v_owner, 'world', p_world)
  on conflict (world_id) where kind = 'world' do nothing
  returning id into v_chat;
  if v_chat is null then
    select id into v_chat from public.account_chats where kind = 'world' and world_id = p_world;
  end if;
  return v_chat;
end;
$$;

revoke all on function public.ensure_world_chat(uuid) from public, anon, authenticated;

create or replace function public.world_members_chat_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat uuid;
begin
  if tg_op = 'INSERT' then
    v_chat := public.ensure_world_chat(new.world_id);
    if v_chat is not null then
      insert into public.account_chat_participants (chat_id, user_id)
      values (v_chat, new.user_id)
      on conflict do nothing;
    end if;
    return new;
  end if;
  delete from public.account_chat_participants p
  using public.account_chats c
  where c.id = p.chat_id and c.kind = 'world' and c.world_id = old.world_id and p.user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists world_members_chat_sync_trg on public.world_members;
create trigger world_members_chat_sync_trg
  after insert or delete on public.world_members
  for each row execute function public.world_members_chat_sync();

-- Bestehende Welten: Chat anlegen und alle aktuellen Mitglieder eintragen.
do $$
declare
  w record;
  v_chat uuid;
begin
  for w in select id from public.worlds loop
    v_chat := public.ensure_world_chat(w.id);
    if v_chat is not null then
      insert into public.account_chat_participants (chat_id, user_id)
      select v_chat, m.user_id from public.world_members m where m.world_id = w.id
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- Gruppe anlegen: Name und mindestens zwei weitere Personen, alle müssen mit der Ersteller:in befreundet sein.
create or replace function public.create_account_group(p_name text, p_members uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_others uuid[];
  v_other uuid;
  v_chat uuid;
begin
  if v_me is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if char_length(v_name) not between 1 and 60 then
    raise exception 'Bitte einen Gruppennamen angeben (bis 60 Zeichen).';
  end if;
  select coalesce(array_agg(distinct m), '{}') into v_others from unnest(coalesce(p_members, '{}')) m where m <> v_me;
  if coalesce(array_length(v_others, 1), 0) < 2 then
    raise exception 'Eine Gruppe braucht mindestens zwei weitere Personen.';
  end if;
  if array_length(v_others, 1) > 49 then
    raise exception 'Eine Gruppe kann höchstens 50 Personen haben.';
  end if;
  foreach v_other in array v_others loop
    if not public.is_friend_of(v_other) then
      raise exception 'Nur mit Freund:innen möglich.';
    end if;
  end loop;

  insert into public.account_chats (created_by, kind, name) values (v_me, 'group', v_name) returning id into v_chat;
  insert into public.account_chat_participants (chat_id, user_id)
  select v_chat, u from unnest(array_append(v_others, v_me)) u;
  return v_chat;
end;
$$;

-- Gruppe umbenennen / Bild ändern (nur die Verwalter:in).
create or replace function public.update_account_group(p_chat uuid, p_name text, p_avatar_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) not between 1 and 60 then
    raise exception 'Bitte einen Gruppennamen angeben (bis 60 Zeichen).';
  end if;
  update public.account_chats
    set name = v_name, avatar_url = nullif(btrim(coalesce(p_avatar_url, '')), '')
    where id = p_chat and kind = 'group' and created_by = auth.uid();
  if not found then
    raise exception 'Das darf nur die Verwalter:in der Gruppe.';
  end if;
end;
$$;

-- Personen zur Gruppe hinzufügen (nur die Verwalter:in, nur Freund:innen).
create or replace function public.add_account_group_members(p_chat uuid, p_members uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_member uuid;
begin
  if not exists (select 1 from public.account_chats where id = p_chat and kind = 'group' and created_by = v_me) then
    raise exception 'Das darf nur die Verwalter:in der Gruppe.';
  end if;
  foreach v_member in array coalesce(p_members, '{}') loop
    if not public.is_friend_of(v_member) then
      raise exception 'Nur mit Freund:innen möglich.';
    end if;
    insert into public.account_chat_participants (chat_id, user_id) values (p_chat, v_member) on conflict do nothing;
  end loop;
  if (select count(*) from public.account_chat_participants where chat_id = p_chat) > 50 then
    raise exception 'Eine Gruppe kann höchstens 50 Personen haben.';
  end if;
end;
$$;

-- Aus der Gruppe gehen (jede:r selbst) oder jemanden entfernen (Verwalter:in).
create or replace function public.remove_account_group_member(p_chat uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_creator uuid;
  v_next uuid;
begin
  select created_by into v_creator from public.account_chats where id = p_chat and kind = 'group';
  if v_creator is null then
    raise exception 'Gruppe nicht gefunden.';
  end if;
  if p_user <> v_me and v_creator <> v_me then
    raise exception 'Das darf nur die Verwalter:in der Gruppe.';
  end if;
  delete from public.account_chat_participants where chat_id = p_chat and user_id = p_user;

  select user_id into v_next from public.account_chat_participants where chat_id = p_chat order by joined_at, user_id limit 1;
  if v_next is null then
    delete from public.account_chats where id = p_chat;
  elsif p_user = v_creator then
    update public.account_chats set created_by = v_next where id = p_chat;
  end if;
end;
$$;

revoke all on function public.create_account_group(text, uuid[]) from public, anon;
revoke all on function public.update_account_group(uuid, text, text) from public, anon;
revoke all on function public.add_account_group_members(uuid, uuid[]) from public, anon;
revoke all on function public.remove_account_group_member(uuid, uuid) from public, anon;
grant execute on function public.create_account_group(text, uuid[]) to authenticated;
grant execute on function public.update_account_group(uuid, text, text) to authenticated;
grant execute on function public.add_account_group_members(uuid, uuid[]) to authenticated;
grant execute on function public.remove_account_group_member(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
