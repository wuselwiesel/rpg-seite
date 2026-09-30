-- Einmaliger Backfill: zu jedem bereits vergebenen Szenen-Ort (story_posts.location) einen
-- leeren Wiki-Eintrag (Kategorie "ort") anlegen, sofern noch keiner mit passendem Titel existiert.
-- Ab jetzt übernehmen createStoryPost/updateStoryMeta (src/app/story/actions.ts) das automatisch.
with locs as (
  select world_id, min(trim(location)) as title, lower(trim(location)) as key
  from public.story_posts
  where location is not null and trim(location) <> ''
  group by world_id, lower(trim(location))
)
insert into public.wiki_pages (world_id, category, title, content, created_by)
select l.world_id, 'ort', l.title, '', w.created_by
from locs l
join public.worlds w on w.id = l.world_id
where not exists (
  select 1 from public.wiki_pages wp
  where wp.world_id = l.world_id and wp.category = 'ort' and lower(wp.title) = l.key
);
