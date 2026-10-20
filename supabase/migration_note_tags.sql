-- Tags an Notizen (klein geschrieben, ohne #, höchstens 12 je Notiz)
alter table public.notes add column if not exists tags text[] not null default '{}' check (cardinality(tags) <= 12);
create index if not exists notes_tags_idx on public.notes using gin (tags);
