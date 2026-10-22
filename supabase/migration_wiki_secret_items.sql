-- Geheime Felder der Wiki-Seite einer Figur, je Feld eine Zeile, mit Freigabe an einzelne Figuren („Vertraute“).
-- Lesen: Besitzer:in der Figur (owns_wiki_character_page) und die Besitzer:innen der Figuren in shared_with.
-- Schreiben: nur die Besitzer:in. Löst die Tabelle wiki_page_secrets ab (bleibt unbenutzt liegen).
create table if not exists public.wiki_page_secret_items (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.wiki_pages (id) on delete cascade,
  position integer not null default 0,
  icon text not null default '' check (char_length(icon) <= 40),
  title text not null check (char_length(title) between 1 and 40),
  text text not null check (char_length(text) between 1 and 300),
  shared_with uuid[] not null default '{}' check (cardinality(shared_with) <= 20),
  updated_at timestamptz not null default now()
);
create index if not exists wiki_page_secret_items_page_idx on public.wiki_page_secret_items (page_id, position);
alter table public.wiki_page_secret_items enable row level security;
create policy wiki_page_secret_items_select on public.wiki_page_secret_items for select to authenticated using (
  public.owns_wiki_character_page(page_id)
  or exists (select 1 from public.characters c where c.id = any (shared_with) and c.owner_id = (select auth.uid()))
);
create policy wiki_page_secret_items_insert on public.wiki_page_secret_items for insert to authenticated with check (public.owns_wiki_character_page(page_id));
create policy wiki_page_secret_items_update on public.wiki_page_secret_items for update to authenticated using (public.owns_wiki_character_page(page_id)) with check (public.owns_wiki_character_page(page_id));
create policy wiki_page_secret_items_delete on public.wiki_page_secret_items for delete to authenticated using (public.owns_wiki_character_page(page_id));
revoke all on public.wiki_page_secret_items from anon;
grant select, insert, update, delete on public.wiki_page_secret_items to authenticated;
