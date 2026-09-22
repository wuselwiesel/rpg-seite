-- Titelbild pro Wiki-Eintrag: eigener Speicher-Ordner (wie world-covers), erscheint auch in der Vorschau.

alter table public.wiki_pages add column if not exists cover_image_url text;

insert into storage.buckets (id, name, public, file_size_limit)
values ('wiki-covers', 'wiki-covers', true, 10485760)
on conflict (id) do nothing;

create policy "wiki_covers_public_read" on storage.objects
  for select using (bucket_id = 'wiki-covers');

create policy "wiki_covers_authenticated_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'wiki-covers');

create policy "wiki_covers_authenticated_update" on storage.objects
  for update to authenticated using (bucket_id = 'wiki-covers');

create policy "wiki_covers_authenticated_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'wiki-covers');

notify pgrst, 'reload schema';
