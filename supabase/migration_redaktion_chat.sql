-- Redaktions-Chat: Chats zwischen Accounts (nicht zwischen Charakteren), unabhängig von Welt und Rollenspiel.
create table if not exists public.account_chats (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.account_chat_participants (
  chat_id uuid not null references public.account_chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (chat_id, user_id)
);

create index if not exists account_chat_participants_user_idx on public.account_chat_participants (user_id);

create table if not exists public.account_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.account_chats (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists account_messages_chat_idx on public.account_messages (chat_id, created_at);

-- Security-definer-Helfer, damit die Policies nicht rekursiv auf account_chat_participants zugreifen.
create or replace function public.is_account_chat_member(p_chat_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.account_chat_participants p
    where p.chat_id = p_chat_id and p.user_id = auth.uid()
  );
$$;

alter table public.account_chats enable row level security;
alter table public.account_chat_participants enable row level security;
alter table public.account_messages enable row level security;

drop policy if exists "account_chats_select_member" on public.account_chats;
create policy "account_chats_select_member" on public.account_chats
  for select to authenticated using (public.is_account_chat_member(id));

drop policy if exists "account_chat_participants_select_member" on public.account_chat_participants;
create policy "account_chat_participants_select_member" on public.account_chat_participants
  for select to authenticated using (public.is_account_chat_member(chat_id));

drop policy if exists "account_chat_participants_update_own" on public.account_chat_participants;
create policy "account_chat_participants_update_own" on public.account_chat_participants
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "account_messages_select_member" on public.account_messages;
create policy "account_messages_select_member" on public.account_messages
  for select to authenticated using (public.is_account_chat_member(chat_id));

drop policy if exists "account_messages_insert_member" on public.account_messages;
create policy "account_messages_insert_member" on public.account_messages
  for insert to authenticated with check (sender_id = auth.uid() and public.is_account_chat_member(chat_id));

drop policy if exists "account_messages_update_own" on public.account_messages;
create policy "account_messages_update_own" on public.account_messages
  for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());

drop policy if exists "account_messages_delete_own" on public.account_messages;
create policy "account_messages_delete_own" on public.account_messages
  for delete to authenticated using (sender_id = auth.uid());

-- Startet (oder findet) den 1:1-Chat mit einer befreundeten Person.
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
  where exists (select 1 from public.account_chat_participants a where a.chat_id = c.id and a.user_id = v_me)
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

grant execute on function public.start_account_chat(uuid) to authenticated;

alter publication supabase_realtime add table public.account_messages;
alter publication supabase_realtime add table public.account_chat_participants;

notify pgrst, 'reload schema';
