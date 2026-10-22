-- Verlauf der Wiki-Seiten: vor jeder inhaltlichen Bearbeitung wird der alte Stand gesichert (Tabelle wiki_page_versions, nur lesbar),
-- wiki_pages.updated_by merkt sich, wer zuletzt geändert hat. Änderungen derselben Person innerhalb von 10 Minuten zählen als eine Bearbeitung.
alter table public.wiki_pages add column if not exists updated_by uuid references public.profiles (id) on delete set null;

create table if not exists public.wiki_page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  saved_by uuid references public.profiles (id) on delete set null,
  saved_at timestamptz not null,
  replaced_at timestamptz not null default now(),
  title text not null,
  lead text,
  content text not null,
  fields jsonb not null default '[]'::jsonb,
  aliases text[] not null default '{}',
  tags text[] not null default '{}',
  cover_image_url text,
  icon_url text,
  gallery text[] not null default '{}',
  page_type text
);
create index if not exists wiki_page_versions_page_idx on public.wiki_page_versions (page_id, replaced_at desc);
create index if not exists wiki_page_versions_saved_by_idx on public.wiki_page_versions (saved_by) where saved_by is not null;
alter table public.wiki_page_versions enable row level security;
create policy wiki_page_versions_select on public.wiki_page_versions for select to authenticated using (
  exists (select 1 from public.wiki_pages p where p.id = page_id)
);
revoke all on public.wiki_page_versions from anon;
grant select on public.wiki_page_versions to authenticated;

create or replace function public.wiki_page_version_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (old.title, old.lead, old.content, old.fields, old.aliases, old.tags, old.cover_image_url, old.icon_url, old.gallery, old.page_type)
     is not distinct from
     (new.title, new.lead, new.content, new.fields, new.aliases, new.tags, new.cover_image_url, new.icon_url, new.gallery, new.page_type) then
    return new;
  end if;
  new.updated_by := coalesce(auth.uid(), old.updated_by);
  if not (old.updated_by is not distinct from auth.uid()
          and exists (select 1 from public.wiki_page_versions v where v.page_id = old.id and v.replaced_at > now() - interval '10 minutes')) then
    insert into public.wiki_page_versions (page_id, saved_by, saved_at, title, lead, content, fields, aliases, tags, cover_image_url, icon_url, gallery, page_type)
    values (old.id, coalesce(old.updated_by, old.created_by), old.updated_at, old.title, old.lead, old.content, old.fields, old.aliases, old.tags, old.cover_image_url, old.icon_url, old.gallery, old.page_type);
  end if;
  return new;
end;
$$;
revoke all on function public.wiki_page_version_trg() from public, anon, authenticated;

create or replace trigger wiki_page_version_before_update before update on public.wiki_pages
  for each row execute function public.wiki_page_version_trg();
