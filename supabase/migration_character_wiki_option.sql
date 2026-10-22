-- Wiki-Einträge für Figuren sind je Welt ein Schalter (worlds.character_wiki_enabled, Standard aus; vorerst an für Pinewood und Universe).
-- Automatisch angelegte Seiten tragen character_auto = true und sind bei ausgeschalteter Option für niemanden sichtbar (RLS und Vorschau),
-- bleiben aber erhalten. Früher vorhandene, nur verknüpfte Seiten (character_auto = false) bleiben immer sichtbar.
alter table public.worlds add column if not exists character_wiki_enabled boolean not null default false;
alter table public.wiki_pages add column if not exists character_auto boolean not null default false;
update public.wiki_pages set character_auto = true where character_id is not null and created_at > now() - interval '2 days';
update public.worlds set character_wiki_enabled = true where id in ('e8f02cf3-8d8c-4bf6-b87a-78b2a624611c', '50e4cb9d-7e4d-4cbe-9cde-8a17717d7521');

create or replace function public.ensure_character_wiki_page(p_character uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.characters%rowtype;
  page_id uuid;
  folder uuid;
  bio_html text;
begin
  select * into c from public.characters where id = p_character and deleted_at is null;
  if not found then return null; end if;
  if not coalesce((select character_wiki_enabled from public.worlds where id = c.world_id), false) then return null; end if;

  select id into page_id from public.wiki_pages where character_id = c.id;
  if page_id is not null then return page_id; end if;

  select id into page_id from public.wiki_pages
   where world_id = c.world_id and character_id is null and lower(title) = lower(c.name)
     and coalesce(page_type, 'person') = 'person'
   order by created_at limit 1;
  if page_id is not null then
    update public.wiki_pages set character_id = c.id where id = page_id;
    return page_id;
  end if;

  select id into folder from public.wiki_folders
   where world_id = c.world_id and parent_id is null and lower(name) = 'charaktere' order by created_at limit 1;
  if folder is null then
    insert into public.wiki_folders (world_id, name, created_by)
    values (c.world_id, 'Charaktere', (select created_by from public.worlds where id = c.world_id))
    returning id into folder;
  end if;

  bio_html := '';
  if coalesce(btrim(c.bio), '') <> '' then
    bio_html := '<p>' || replace(replace(replace(replace(btrim(c.bio), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), E'\n', '<br>') || '</p>';
  end if;

  insert into public.wiki_pages (world_id, category, title, content, page_type, folder_id, cover_image_url, created_by, character_id, character_auto)
  values (c.world_id, 'npc', c.name, bio_html, 'person', folder, c.avatar_url, c.owner_id, c.id, true)
  returning id into page_id;
  return page_id;
end;
$$;
revoke all on function public.ensure_character_wiki_page(uuid) from public, anon, authenticated;

-- Admins: fehlende Seiten für alle Figuren der Welt anlegen (nach dem Einschalten der Option)
create or replace function public.sync_character_wiki(p_world uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  r record;
begin
  if not public.is_world_admin(p_world) then
    raise exception 'Nur Welt-Admins dürfen das.';
  end if;
  for r in select id from public.characters where world_id = p_world and deleted_at is null loop
    if public.ensure_character_wiki_page(r.id) is not null then n := n + 1; end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.sync_character_wiki(uuid) from public, anon;
grant execute on function public.sync_character_wiki(uuid) to authenticated;

create or replace function public.world_preview_wiki(p_world uuid)
returns table (id uuid, title text, page_type text, lead text, cover_image_url text, icon_url text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.title, p.page_type, p.lead, p.cover_image_url, p.icon_url
  from public.wiki_pages p join public.worlds w on w.id = p.world_id
  where p.world_id = p_world and w.preview <> 'none' and not p.is_draft
    and (not p.character_auto or w.character_wiki_enabled)
  order by p.title
  limit 300;
$$;

create or replace function public.world_preview_wiki_page(p_page uuid)
returns table (id uuid, world_id uuid, title text, page_type text, lead text, content text, cover_image_url text, icon_url text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.world_id, p.title, p.page_type, p.lead, p.content, p.cover_image_url, p.icon_url
  from public.wiki_pages p join public.worlds w on w.id = p.world_id
  where p.id = p_page and w.preview <> 'none' and not p.is_draft
    and (not p.character_auto or w.character_wiki_enabled);
$$;

alter policy wiki_pages_select_member on public.wiki_pages
  using (is_world_member(world_id) and ((not is_draft) or created_by = (select auth.uid()))
         and ((not character_auto) or exists (select 1 from public.worlds w where w.id = wiki_pages.world_id and w.character_wiki_enabled)));
alter policy wiki_pages_select_visible on public.wiki_pages
  using (is_world_member(world_id) and ((not is_draft) or created_by = (select auth.uid()))
         and ((not character_auto) or exists (select 1 from public.worlds w where w.id = wiki_pages.world_id and w.character_wiki_enabled)));
