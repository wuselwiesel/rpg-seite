-- Migration: Bilder im Redaktions-Chat (Account-Chat)
-- Nachrichten dürfen ein Bild haben; dann darf der Text leer sein. Hochgeladen wird in den bestehenden Bucket "chat-media".

alter table public.account_messages add column if not exists image_url text;

alter table public.account_messages drop constraint if exists account_messages_content_check;
alter table public.account_messages drop constraint if exists account_messages_content_or_image;
alter table public.account_messages
  add constraint account_messages_content_or_image check (
    char_length(content) <= 4000 and (char_length(content) >= 1 or image_url is not null)
  );

notify pgrst, 'reload schema';
