-- Chat-Verlauf: die neuesten Nachrichten eines Chats (order by created_at desc limit …) kommen direkt aus dem Index statt sortiert zu werden.
create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at desc);
