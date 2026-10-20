-- Ordner im Notizbuch (eine Ebene, nur für die eigene Person)
create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists note_folders_name_uidx on public.note_folders (user_id, lower(name));
alter table public.note_folders enable row level security;
drop policy if exists note_folders_own on public.note_folders;
create policy note_folders_own on public.note_folders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.note_folders from anon;
grant select, insert, update, delete on public.note_folders to authenticated;

-- Wird ein Ordner gelöscht, bleiben die Notizen erhalten (ohne Ordner)
alter table public.notes add column if not exists folder_id uuid references public.note_folders (id) on delete set null;
create index if not exists notes_folder_idx on public.notes (folder_id) where folder_id is not null;
