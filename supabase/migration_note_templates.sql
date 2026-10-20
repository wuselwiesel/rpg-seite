-- Notizen als Vorlage: erscheinen nicht in der normalen Liste, sondern unter „Vorlagen“
alter table public.notes add column if not exists is_template boolean not null default false;
create index if not exists notes_template_idx on public.notes (user_id) where is_template;
