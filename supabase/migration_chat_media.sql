-- Migration: Chats löschen, Gruppenbild, Bilder in Nachrichten
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

alter table public.chats add column if not exists avatar_url text;
alter table public.messages add column if not exists image_url text;

-- Löschen: die Ersteller:in eines Chats, bei 1:1-Chats zusätzlich jede Teilnehmer:in.
drop policy if exists "chats_delete_own" on public.chats;
create policy "chats_delete_own" on public.chats
  for delete to authenticated using (
    created_by = auth.uid() or (not is_group and public.is_chat_participant(id))
  );

-- Bild-Uploads für Chat-Nachrichten
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-media', 'chat-media', true, 5242880)
on conflict (id) do nothing;

drop policy if exists "chat_media_public_read" on storage.objects;
create policy "chat_media_public_read" on storage.objects
  for select using (bucket_id = 'chat-media');

drop policy if exists "chat_media_authenticated_insert" on storage.objects;
create policy "chat_media_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'chat-media');
