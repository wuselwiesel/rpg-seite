-- Vorlage der Felder für Wiki-Einträge von Figuren (je Welt) und Setzen der Felder beim Anlegen einer Figur.
alter table public.worlds add column if not exists character_wiki_template jsonb not null default '[]'::jsonb
  check (jsonb_typeof(character_wiki_template) = 'array' and jsonb_array_length(character_wiki_template) <= 12);

create or replace function public.init_character_wiki(p_character uuid, p_fields jsonb, p_secrets jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_page uuid;
  r jsonb;
  pos integer := 0;
begin
  if not exists (select 1 from public.characters c where c.id = p_character and c.owner_id = auth.uid()) then
    raise exception 'Das ist nicht deine Figur.';
  end if;
  v_page := public.ensure_character_wiki_page(p_character);
  if v_page is null then return null; end if;
  if jsonb_typeof(p_fields) = 'array' and jsonb_array_length(p_fields) <= 20 then
    update public.wiki_pages w set fields = p_fields
     where w.id = v_page and w.character_auto and w.fields = '[]'::jsonb;
  end if;
  if jsonb_typeof(p_secrets) = 'array' and not exists (select 1 from public.wiki_page_secret_items i where i.page_id = v_page) then
    for r in select * from jsonb_array_elements(p_secrets) loop
      exit when pos >= 12;
      insert into public.wiki_page_secret_items (page_id, position, icon, title, text, shared_with)
      values (v_page, pos, left(coalesce(r->>'icon', ''), 40), left(r->>'title', 40), left(r->>'text', 300),
              coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(coalesce(r->'shared_with', '[]'::jsonb)) x where x ~* '^[0-9a-f-]{36}$'), '{}'));
      pos := pos + 1;
    end loop;
  end if;
  return v_page;
end;
$$;
revoke all on function public.init_character_wiki(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.init_character_wiki(uuid, jsonb, jsonb) to authenticated;
