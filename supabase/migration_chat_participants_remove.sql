-- Gruppenchat: wer die Gruppe erstellt hat, darf Mitglieder entfernen (zusätzlich zu chat_participants_delete_own: jede:r darf die eigene Teilnahme beenden).
create policy chat_participants_delete_creator on public.chat_participants
  for delete to authenticated using (
    exists (select 1 from public.chats ch where ch.id = chat_id and ch.is_group and ch.created_by = (select auth.uid()))
  );
