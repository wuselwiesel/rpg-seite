-- Dateianhänge in Notizen: privater Speicher, jede:r liest, schreibt und löscht nur im eigenen Ordner (Pfad beginnt mit der eigenen Konto-ID); Zugriff über signierte Links
insert into storage.buckets (id, name, public, file_size_limit)
values ('note-files', 'note-files', false, 20971520)
on conflict (id) do nothing;
drop policy if exists "note_files_read" on storage.objects;
create policy "note_files_read" on storage.objects
  for select to authenticated using (bucket_id = 'note-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "note_files_insert" on storage.objects;
create policy "note_files_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'note-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "note_files_delete" on storage.objects;
create policy "note_files_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'note-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
