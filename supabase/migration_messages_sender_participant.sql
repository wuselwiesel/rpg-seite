-- Chat-Nachrichten: die schreibende Figur muss selbst Teilnehmerin des Chats sein (bisher reichte es, dass sie mir gehört und ich im Chat bin).
-- Sonst erscheinen Nachrichten von Figuren, die in der Teilnehmerliste fehlen, bei den anderen ohne Namen und Bild.
-- Bestand geprüft: keine bestehende Nachricht verstößt dagegen.
alter policy messages_insert_participant on public.messages with check (
  public.is_chat_participant(chat_id)
  and exists (
    select 1 from public.characters c
    where c.id = messages.character_id and c.owner_id = (select auth.uid())
  )
  and exists (
    select 1 from public.chat_participants cp
    where cp.chat_id = messages.chat_id and cp.character_id = messages.character_id
  )
);
