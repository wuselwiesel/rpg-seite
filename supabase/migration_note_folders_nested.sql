-- Ordner im Notizbuch verschachteln (Tiefe höchstens 3, geprüft in der App); Unterordner werden mit dem Ordner gelöscht, die Notizen bleiben (ohne Ordner)
alter table public.note_folders add column if not exists parent_id uuid references public.note_folders (id) on delete cascade;
create index if not exists note_folders_parent_idx on public.note_folders (parent_id) where parent_id is not null;
create unique index if not exists note_folders_name_parent_uidx on public.note_folders (user_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
drop index if exists public.note_folders_name_uidx;
