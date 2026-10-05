-- Migration: Redaktions-Chat: Antworten, Reaktionen, Anheften, @-Erwähnungen
-- * reply_to_id: Antwort auf eine Nachricht (bleibt leer, wenn die Ursprungsnachricht gelöscht wird).
-- * account_message_reactions: Emoji-Reaktionen pro Account (jede:r Mitglied darf reagieren, eigene entfernen).
-- * pinned_at/pinned_by: angeheftete Nachrichten; anheften dürfen alle Mitglieder (über die Funktion).
-- * mentioned_user_ids: bei der Nachricht erwähnte Accounts (Benachrichtigung auch bei stummem Chat).

alter table public.account_messages add column if not exists reply_to_id uuid references public.account_messages (id) on delete set null;
alter table public.account_messages add column if not exists pinned_at timestamptz;
alter table public.account_messages add column if not exists pinned_by uuid references public.profiles (id) on delete set null;
alter table public.account_messages add column if not exists mentioned_user_ids uuid[] not null default '{}';

create index if not exists account_messages_pinned_idx on public.account_messages (chat_id, pinned_at) where pinned_at is not null;

create table if not exists public.account_message_reactions (
  message_id uuid not null references public.account_messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

alter table public.account_message_reactions enable row level security;

create or replace function public.can_see_account_message(p_message_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.account_messages m
    where m.id = p_message_id and public.is_account_chat_member(m.chat_id)
  );
$$;

revoke all on function public.can_see_account_message(uuid) from public, anon;
grant execute on function public.can_see_account_message(uuid) to authenticated;

drop policy if exists "account_message_reactions_select" on public.account_message_reactions;
create policy "account_message_reactions_select" on public.account_message_reactions
  for select to authenticated using (public.can_see_account_message(message_id));

drop policy if exists "account_message_reactions_insert" on public.account_message_reactions;
create policy "account_message_reactions_insert" on public.account_message_reactions
  for insert to authenticated with check (user_id = auth.uid() and public.can_see_account_message(message_id));

drop policy if exists "account_message_reactions_delete" on public.account_message_reactions;
create policy "account_message_reactions_delete" on public.account_message_reactions
  for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.account_message_reactions;

-- Anheften / Lösen: jedes Mitglied des Chats.
create or replace function public.set_account_message_pin(p_message uuid, p_pin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chat uuid;
begin
  select chat_id into v_chat from public.account_messages where id = p_message;
  if v_chat is null or not public.is_account_chat_member(v_chat) then
    raise exception 'Keine Berechtigung';
  end if;
  update public.account_messages
    set pinned_at = case when p_pin then now() else null end,
        pinned_by = case when p_pin then auth.uid() else null end
    where id = p_message;
end;
$$;

revoke all on function public.set_account_message_pin(uuid, boolean) from public, anon;
grant execute on function public.set_account_message_pin(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
