-- Aus einer Gruppe austreten: jede:r darf die eigene Teilnahme (Figur gehört mir) in Gruppen entfernen. In 1:1-Chats nicht.
-- Die App schreibt davor die Systemzeile und verhindert, dass die Letzte austritt.
create policy chat_participants_delete_own on public.chat_participants
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = (select auth.uid()))
    and exists (select 1 from public.chats ch where ch.id = chat_id and ch.is_group)
  );
