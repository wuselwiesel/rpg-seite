-- Jede Figur bekommt einen Wiki-Eintrag (Seitenart „Person“), verknüpft über wiki_pages.character_id.
-- Gibt es in der Welt schon eine Person-Seite mit dem Namen der Figur, wird sie verknüpft (kein Doppel).
-- Neue Seiten kommen in den Ordner „Charaktere“ der Welt. Die ChaBo-Angaben zeigt die App live auf der Seite.
alter table public.wiki_pages add column if not exists character_id uuid references public.characters (id) on delete set null;
create unique index if not exists wiki_pages_character_uidx on public.wiki_pages (character_id) where character_id is not null;

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

  select id into page_id from public.wiki_pages where character_id = c.id;
  if page_id is not null then return page_id; end if;

  -- vorhandene Seite mit dem Namen der Figur verknüpfen
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

  insert into public.wiki_pages (world_id, category, title, content, page_type, folder_id, cover_image_url, created_by, character_id)
  values (c.world_id, 'npc', c.name, bio_html, 'person', folder, c.avatar_url, c.owner_id, c.id)
  returning id into page_id;
  return page_id;
end;
$$;
revoke all on function public.ensure_character_wiki_page(uuid) from public, anon, authenticated;

create or replace function public.character_wiki_page_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.ensure_character_wiki_page(new.id);
  else
    -- Name und Bild der Seite folgen der Figur, solange die Seite sie nicht eigenwillig geändert hat
    if new.name is distinct from old.name then
      update public.wiki_pages set title = new.name where character_id = new.id and title = old.name;
    end if;
    if new.avatar_url is distinct from old.avatar_url then
      update public.wiki_pages set cover_image_url = new.avatar_url
       where character_id = new.id and (cover_image_url is null or cover_image_url = old.avatar_url);
    end if;
    -- wiederhergestellte Figur: Seite sicherstellen
    if old.deleted_at is not null and new.deleted_at is null then
      perform public.ensure_character_wiki_page(new.id);
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.character_wiki_page_trg() from public, anon, authenticated;

create or replace trigger character_wiki_page_ins after insert on public.characters
  for each row execute function public.character_wiki_page_trg();
create or replace trigger character_wiki_page_upd after update of name, avatar_url, deleted_at on public.characters
  for each row execute function public.character_wiki_page_trg();

-- Bestehende Figuren (einmalig ausgeführt, gefahrlos wiederholbar)
select count(public.ensure_character_wiki_page(id)) from public.characters where deleted_at is null;
