-- Chats archivieren (je Person, wie „stumm“) und Redaktions-Chats löschen.
alter table public.chat_participants add column if not exists archived boolean not null default false;
alter table public.account_chat_participants add column if not exists archived boolean not null default false;

-- Eine neue Nachricht holt den Chat bei den anderen aus dem Archiv
create or replace function public._chat_unarchive_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.chat_participants set archived = false
   where chat_id = new.chat_id and archived and character_id <> new.character_id;
  return new;
end $$;

create or replace function public._account_chat_unarchive_on_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.account_chat_participants set archived = false
   where chat_id = new.chat_id and archived and user_id <> new.sender_id;
  return new;
end $$;

do $$ begin
  create trigger messages_unarchive_trg after insert on public.messages for each row execute function public._chat_unarchive_on_message();
exception when duplicate_object then null; end $$;
do $$ begin
  create trigger account_messages_unarchive_trg after insert on public.account_messages for each row execute function public._account_chat_unarchive_on_message();
exception when duplicate_object then null; end $$;

-- Redaktions-Chats löschen: 1:1-Chats jede Teilnehmer:in, Gruppen die Ersteller:in (Welt- und Szenen-Chats nie)
do $$ begin
  create policy account_chats_delete on public.account_chats for delete to authenticated using (
    public.is_account_chat_member(id) and kind in ('direct', 'group') and (kind = 'direct' or created_by = auth.uid())
  );
exception when duplicate_object then null; end $$;

revoke all on function public._chat_unarchive_on_message() from public, anon, authenticated;
revoke all on function public._account_chat_unarchive_on_message() from public, anon, authenticated;
notify pgrst, 'reload schema';
