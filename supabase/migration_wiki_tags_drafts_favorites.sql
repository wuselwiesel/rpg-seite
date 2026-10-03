-- Wiki Runde 3: Tags, Entwürfe, Favoriten.
-- Entwürfe sieht nur, wer sie angelegt hat; alle anderen Mitglieder sehen die Seite erst nach dem Veröffentlichen.
alter table public.wiki_pages add column if not exists tags text[] not null default '{}';
alter table public.wiki_pages add column if not exists is_draft boolean not null default false;
create index if not exists wiki_pages_tags_idx on public.wiki_pages using gin (tags);

-- Bestehende Regel direkt ändern (kein DROP, daher ohne Lücke, in der niemand etwas sieht).
alter policy "wiki_pages_select_member" on public.wiki_pages
  using (is_world_member(world_id) and (not is_draft or created_by = auth.uid()));

create table if not exists public.wiki_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, page_id)
);
alter table public.wiki_favorites enable row level security;
drop policy if exists "wiki_favorites_select_own" on public.wiki_favorites;
create policy "wiki_favorites_select_own" on public.wiki_favorites for select using (user_id = auth.uid());
drop policy if exists "wiki_favorites_insert_own" on public.wiki_favorites;
create policy "wiki_favorites_insert_own" on public.wiki_favorites for insert with check (user_id = auth.uid());
drop policy if exists "wiki_favorites_delete_own" on public.wiki_favorites;
create policy "wiki_favorites_delete_own" on public.wiki_favorites for delete using (user_id = auth.uid());
grant select, insert, delete on public.wiki_favorites to authenticated;

notify pgrst, 'reload schema';
