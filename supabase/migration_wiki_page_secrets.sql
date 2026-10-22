-- Geheime Felder auf der Wiki-Seite einer Figur: eigene Tabelle, die nur die Besitzer:in der Figur (bei NPCs auch Welt-Admins) lesen und ändern darf.
-- Die öffentliche Seite (wiki_pages) enthält nie etwas Geheimes.
create or replace function public.owns_wiki_character_page(p_page uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.wiki_pages p
    join public.characters c on c.id = p.character_id
    where p.id = p_page
      and (c.owner_id = auth.uid() or (c.is_npc and public.is_world_admin(c.world_id)))
  );
$$;
revoke all on function public.owns_wiki_character_page(uuid) from public, anon;
grant execute on function public.owns_wiki_character_page(uuid) to authenticated;

create table if not exists public.wiki_page_secrets (
  page_id uuid primary key references public.wiki_pages (id) on delete cascade,
  fields jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array' and jsonb_array_length(fields) <= 20),
  updated_at timestamptz not null default now()
);
alter table public.wiki_page_secrets enable row level security;
create policy wiki_page_secrets_select on public.wiki_page_secrets for select to authenticated using (public.owns_wiki_character_page(page_id));
create policy wiki_page_secrets_insert on public.wiki_page_secrets for insert to authenticated with check (public.owns_wiki_character_page(page_id));
create policy wiki_page_secrets_update on public.wiki_page_secrets for update to authenticated using (public.owns_wiki_character_page(page_id)) with check (public.owns_wiki_character_page(page_id));
create policy wiki_page_secrets_delete on public.wiki_page_secrets for delete to authenticated using (public.owns_wiki_character_page(page_id));
revoke all on public.wiki_page_secrets from anon;
grant select, insert, update, delete on public.wiki_page_secrets to authenticated;
