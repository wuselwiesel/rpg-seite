-- Migration: Videos im Chat
-- Videos liegen wie Bilder im Bucket "chat-media" (Nachrichten-Spalte `image_url`, erkannt an der Dateiendung).
-- Dafür wird die Größengrenze des Buckets von 5 MB auf 50 MB angehoben (wie bei "post-media").

update storage.buckets set file_size_limit = 52428800 where id = 'chat-media';
