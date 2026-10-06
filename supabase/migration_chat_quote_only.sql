-- Migration: Eine Chat-Nachricht darf auch nur aus einem Zitat (Szene) bestehen, ohne Text und Bild.
alter table public.account_messages drop constraint if exists account_messages_content_or_image;
alter table public.account_messages add constraint account_messages_content_or_image
  check (char_length(content) <= 4000 and (char_length(content) >= 1 or image_url is not null or quote is not null));

notify pgrst, 'reload schema';
