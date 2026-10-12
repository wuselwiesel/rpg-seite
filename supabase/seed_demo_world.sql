-- Übungswelt: Beispielinhalt = Kopie der Testwelt „Schattenmoor“ (Namen, Orte, Figuren, Beiträge, Szenen, Wiki, Beziehungen).
-- Alle kopierten Zeilen bekommen feste IDs de000000-…; demo_world_reset() lässt sie stehen und entfernt alles andere.
-- Aufruf bei Bedarf erneut (löscht zuerst den alten Beispielinhalt der Übungswelt).
delete from public.characters where world_id = 'de000000-0000-4000-8000-000000000002' and id::text like 'de000000-%';
delete from public.story_posts where world_id = 'de000000-0000-4000-8000-000000000002' and id::text like 'de000000-%';
delete from public.story_arcs where world_id = 'de000000-0000-4000-8000-000000000002' and id::text like 'de000000-%';
delete from public.wiki_pages where world_id = 'de000000-0000-4000-8000-000000000002' and id::text like 'de000000-%';
delete from public.wiki_folders where world_id = 'de000000-0000-4000-8000-000000000002' and id::text like 'de000000-%';
delete from public.character_relationships where world_id = 'de000000-0000-4000-8000-000000000002' and id::text like 'de000000-%';
delete from public.trash_items where world_id = 'de000000-0000-4000-8000-000000000002';

create temp table m_char as
  select id as old, ('de000000-0000-4000-8000-01' || lpad(to_hex(row_number() over (order by is_npc, created_at, id)::int), 10, '0'))::uuid as new
  from public.characters where world_id = 'a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e' and deleted_at is null;
insert into public.characters (id, owner_id, name, avatar_url, bio, world_id, species, gender, status_text, quote, is_npc, house, banner_url, custom_fields)
select m.new, 'de000000-0000-4000-8000-000000000001', c.name, c.avatar_url, c.bio, 'de000000-0000-4000-8000-000000000002', c.species, c.gender, c.status_text, c.quote, c.is_npc, c.house, c.banner_url, c.custom_fields
from public.characters c join m_char m on m.old = c.id;

create temp table m_post as
  select p.id as old, ('de000000-0000-4000-8000-02' || lpad(to_hex(row_number() over (order by p.created_at, p.id)::int), 10, '0'))::uuid as new
  from public.posts p join m_char c on c.old = p.character_id where p.story_post_id is null and p.publish_at <= now();
insert into public.posts (id, character_id, title, content, tags, media_url, media_type, media_urls, pinned, bonus_likes)
select m.new, c.new, p.title, p.content, p.tags, p.media_url, p.media_type, p.media_urls, p.pinned, p.bonus_likes
from public.posts p join m_post m on m.old = p.id join m_char c on c.old = p.character_id;
insert into public.comments (id, post_id, character_id, content)
select ('de000000-0000-4000-8000-03' || lpad(to_hex(row_number() over (order by cm.created_at, cm.id)::int), 10, '0'))::uuid, mp.new, mc.new, cm.content
from public.comments cm join m_post mp on mp.old = cm.post_id join m_char mc on mc.old = cm.character_id;

create temp table m_arc as
  select id as old, ('de000000-0000-4000-8000-08' || lpad(to_hex(row_number() over (order by created_at, id)::int), 10, '0'))::uuid as new
  from public.story_arcs where world_id = 'a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e';
insert into public.story_arcs (id, world_id, name, created_by)
select m.new, 'de000000-0000-4000-8000-000000000002', a.name, 'de000000-0000-4000-8000-000000000001' from public.story_arcs a join m_arc m on m.old = a.id;

create temp table m_scene as
  select s.id as old, (row_number() over (order by s.created_at desc, s.id))::int as n,
         ('de000000-0000-4000-8000-04' || lpad(to_hex(row_number() over (order by s.created_at desc, s.id)::int), 10, '0'))::uuid as new
  from public.story_posts s join m_char c on c.old = s.character_id
  where s.world_id = 'a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e' and not s.is_private;
insert into public.story_posts (id, world_id, character_id, title, content, tags, arc_id, location, in_world_time, pinned, archived, narrator, short_summary, recap, recap_by, recap_at, ambience_image_url)
select ms.new, 'de000000-0000-4000-8000-000000000002', c.new, s.title, s.content, s.tags, ma.new, s.location, s.in_world_time, s.pinned, s.archived, s.narrator, s.short_summary,
       s.recap, case when s.recap is not null then 'de000000-0000-4000-8000-000000000001'::uuid end, case when s.recap is not null then now() end, s.ambience_image_url
from public.story_posts s join m_scene ms on ms.old = s.id join m_char c on c.old = s.character_id left join m_arc ma on ma.old = s.arc_id;
insert into public.story_post_arcs (story_post_id, arc_id)
select ms.new, ma.new from public.story_post_arcs spa join m_scene ms on ms.old = spa.story_post_id join m_arc ma on ma.old = spa.arc_id on conflict do nothing;
insert into public.story_post_cast (story_post_id, character_id)
select ms.new, mc.new from public.story_post_cast cst join m_scene ms on ms.old = cst.story_post_id join m_char mc on mc.old = cst.character_id on conflict do nothing;

create temp table m_entry as
  select e.id as old, ms.new as scene_new, ms.n, row_number() over (partition by e.story_post_id order by e.created_at, e.id)::int as rn
  from public.story_entries e join m_scene ms on ms.old = e.story_post_id join m_char c on c.old = e.character_id;
insert into public.story_entries (id, story_post_id, character_id, content, kind, roll_label, roll_value, roll_die, roll_result, roll_success, roll_bonus, roll_stat_name, roll_condition, chapter_title, chapter_summary, chapter_label, is_spoiler)
select ('de000000-0000-4000-8000-05' || lpad(to_hex(me.n * 100 + me.rn), 10, '0'))::uuid, me.scene_new, mc.new, e.content, e.kind, e.roll_label, e.roll_value, e.roll_die, e.roll_result,
       e.roll_success, e.roll_bonus, e.roll_stat_name, e.roll_condition, e.chapter_title, e.chapter_summary, e.chapter_label, e.is_spoiler
from public.story_entries e join m_entry me on me.old = e.id join m_char mc on mc.old = e.character_id
where me.rn <= 40;

create temp table m_folder as
  select id as old, ('de000000-0000-4000-8000-06' || lpad(to_hex(row_number() over (order by created_at, id)::int), 10, '0'))::uuid as new
  from public.wiki_folders where world_id = 'a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e';
insert into public.wiki_folders (id, world_id, name, created_by, icon, color)
select m.new, 'de000000-0000-4000-8000-000000000002', f.name, 'de000000-0000-4000-8000-000000000001', f.icon, f.color from public.wiki_folders f join m_folder m on m.old = f.id;
update public.wiki_folders f set parent_id = mp.new
from public.wiki_folders src join m_folder ms on ms.old = src.id join m_folder mp on mp.old = src.parent_id
where f.id = ms.new;

insert into public.wiki_types (world_id, id, label, plural, icon, color, hint, fields, outline, portrait, sort_order)
select 'de000000-0000-4000-8000-000000000002', t.id, t.label, t.plural, t.icon, t.color, t.hint, t.fields, t.outline, t.portrait, t.sort_order
from public.wiki_types t where t.world_id = 'a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e' on conflict do nothing;

create temp table m_page as
  select id as old, ('de000000-0000-4000-8000-07' || lpad(to_hex(row_number() over (order by created_at, id)::int), 10, '0'))::uuid as new
  from public.wiki_pages where world_id = 'a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e' and not is_draft;
insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, gallery, fields, page_type, tags, is_draft, icon_url,
                               event_year, event_month, event_day, event_end_year, event_end_month, event_end_day, event_label, event_end_label)
select m.new, 'de000000-0000-4000-8000-000000000002', p.category, p.title, p.content, 'de000000-0000-4000-8000-000000000001', p.aliases, p.cover_image_url, mf.new, p.lead, p.gallery, p.fields,
       p.page_type, p.tags, false, p.icon_url, p.event_year, p.event_month, p.event_day, p.event_end_year, p.event_end_month, p.event_end_day, p.event_label, p.event_end_label
from public.wiki_pages p join m_page m on m.old = p.id left join m_folder mf on mf.old = p.folder_id;
update public.wiki_pages w set parent_page_id = mp.new
from public.wiki_pages src join m_page ms on ms.old = src.id join m_page mp on mp.old = src.parent_page_id
where w.id = ms.new;

insert into public.character_relationships (id, world_id, character_a_id, character_b_id, type, label, created_by, color, category, family_role, type_b)
select ('de000000-0000-4000-8000-09' || lpad(to_hex(row_number() over (order by r.created_at, r.id)::int), 10, '0'))::uuid,
       'de000000-0000-4000-8000-000000000002', ma.new, mb.new, r.type, r.label, 'de000000-0000-4000-8000-000000000001', r.color, r.category, r.family_role, r.type_b
from public.character_relationships r join m_char ma on ma.old = r.character_a_id join m_char mb on mb.old = r.character_b_id
where r.world_id = 'a70ddcbf-f8cc-4d70-94ea-ef6de3c60e4e' and not coalesce(r.is_secret, false);

-- Verweise im Text (Erwähnungen, Seiten- und Szenenlinks) auf die kopierten IDs umbiegen
create temp table m_all as
  select old, new from m_char union all select old, new from m_scene union all select old, new from m_page union all select old, new from m_post;
do $$
declare r record;
begin
  for r in select old, new from m_all loop
    update public.story_entries set content = replace(content, r.old::text, r.new::text) where id::text like 'de000000-%' and content like '%' || r.old::text || '%';
    update public.story_posts set content = replace(content, r.old::text, r.new::text) where id::text like 'de000000-%' and content like '%' || r.old::text || '%';
    update public.posts set content = replace(content, r.old::text, r.new::text) where id::text like 'de000000-%' and content like '%' || r.old::text || '%';
    update public.comments set content = replace(content, r.old::text, r.new::text) where id::text like 'de000000-%' and content like '%' || r.old::text || '%';
    update public.wiki_pages set content = replace(content, r.old::text, r.new::text) where id::text like 'de000000-%' and content like '%' || r.old::text || '%';
  end loop;
end $$;

update public.worlds set
  description = 'Schattenmoor: ein nebelverhangenes Moorland voller alter Gutshäuser, Flüsterwälder und Wesen, die man besser nicht beim Namen ruft. Zum Ausprobieren.',
  welcome_html = '<p><strong>Willkommen in Schattenmoor!</strong> Das hier ist eine Übungswelt: Schreib, würfle und baue Wiki-Seiten, so viel du magst. Was du anlegst, wird nachts aufgeräumt – die Bewohner von Schattenmoor bleiben.</p><ul><li>Lege einen Charakter an – ein Name genügt.</li><li>Antworte in einer der Szenen.</li><li>Stöbere im Wiki und lege eine eigene Seite an.</li></ul>'
where id = 'de000000-0000-4000-8000-000000000002';
delete from public.trash_items where world_id = 'de000000-0000-4000-8000-000000000002';
select public.demo_world_refresh_dates();
