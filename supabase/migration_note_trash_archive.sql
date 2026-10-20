-- Papierkorb (30 Tage, wird beim Öffnen des Notizbuchs geleert) und Archiv für Notizen
alter table public.notes add column if not exists deleted_at timestamptz;
alter table public.notes add column if not exists archived boolean not null default false;
create index if not exists notes_deleted_idx on public.notes (user_id, deleted_at) where deleted_at is not null;
