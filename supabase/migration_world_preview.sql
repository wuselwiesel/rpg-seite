-- Welt vor dem Beitritt erkunden: je Welt einstellbar (aus / Info: Willkommen, Wiki, Charaktere / alles: auch Szenen).
-- Die Vorschau läuft nur über diese Funktionen (security definer): nur freigegebene Inhalte, nie Entwürfe, private Szenen,
-- Geheimes oder Chats.
alter table public.worlds add column if not exists preview text not null default 'none';
alter table public.worlds drop constraint if exists worlds_preview_check;
alter table public.worlds add constraint worlds_preview_check check (preview in ('none', 'info', 'full'));

create or replace function public.world_preview_info(p_world uuid)
returns table (id uuid, name text, description text, cover_image_url text, welcome_html text, preview text, join_mode text, created_by uuid,
               is_member boolean, has_request boolean, member_count bigint)
language sql stable security definer set search_path = public
as $$
  select w.id, w.name, w.description, w.cover_image_url, w.welcome_html, w.preview, w.join_mode, w.created_by,
         exists (select 1 from public.world_members m where m.world_id = w.id and m.user_id = auth.uid()),
         exists (select 1 from public.world_join_requests r where r.world_id = w.id and r.user_id = auth.uid() and r.status = 'pending'),
         (select count(*) from public.world_members m where m.world_id = w.id)
  from public.worlds w
  where w.id = p_world and w.preview <> 'none';
$$;

create or replace function public.world_preview_wiki(p_world uuid)
returns table (id uuid, title text, page_type text, lead text, cover_image_url text, icon_url text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.title, p.page_type, p.lead, p.cover_image_url, p.icon_url
  from public.wiki_pages p join public.worlds w on w.id = p.world_id
  where p.world_id = p_world and w.preview <> 'none' and not p.is_draft
  order by p.title
  limit 300;
$$;

create or replace function public.world_preview_wiki_page(p_page uuid)
returns table (id uuid, world_id uuid, title text, page_type text, lead text, content text, cover_image_url text, icon_url text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.world_id, p.title, p.page_type, p.lead, p.content, p.cover_image_url, p.icon_url
  from public.wiki_pages p join public.worlds w on w.id = p.world_id
  where p.id = p_page and w.preview <> 'none' and not p.is_draft;
$$;

create or replace function public.world_preview_characters(p_world uuid)
returns table (id uuid, name text, avatar_url text, bio text, is_npc boolean)
language sql stable security definer set search_path = public
as $$
  select c.id, c.name, c.avatar_url, c.bio, coalesce(c.is_npc, false)
  from public.characters c join public.worlds w on w.id = c.world_id
  where c.world_id = p_world and w.preview <> 'none' and c.deleted_at is null
  order by c.name
  limit 300;
$$;

create or replace function public.world_preview_scenes(p_world uuid)
returns table (id uuid, title text, content text, author_name text, author_avatar_url text, created_at timestamptz, entry_count bigint, location text)
language sql stable security definer set search_path = public
as $$
  select s.id, s.title, s.content, c.name, c.avatar_url, s.created_at,
         (select count(*) from public.story_entries e where e.story_post_id = s.id and e.kind is distinct from 'chapter'),
         s.location
  from public.story_posts s join public.worlds w on w.id = s.world_id left join public.characters c on c.id = s.character_id
  where s.world_id = p_world and w.preview = 'full' and not s.is_private and not s.archived
  order by s.created_at desc
  limit 100;
$$;

create or replace function public.world_preview_scene(p_story uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id, 'world_id', s.world_id, 'title', s.title, 'content', s.content, 'location', s.location, 'created_at', s.created_at,
    'author', c.name,
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'content', e.content, 'created_at', e.created_at, 'author', ec.name, 'avatar_url', ec.avatar_url, 'kind', e.kind, 'roll_label', e.roll_label) order by e.created_at)
      from (select * from public.story_entries x where x.story_post_id = s.id order by x.created_at limit 200) e
      left join public.characters ec on ec.id = e.character_id
    ), '[]'::jsonb)
  )
  from public.story_posts s join public.worlds w on w.id = s.world_id left join public.characters c on c.id = s.character_id
  where s.id = p_story and w.preview = 'full' and not s.is_private;
$$;

revoke execute on function public.world_preview_info(uuid), public.world_preview_wiki(uuid), public.world_preview_wiki_page(uuid),
  public.world_preview_characters(uuid), public.world_preview_scenes(uuid), public.world_preview_scene(uuid) from public, anon;
grant execute on function public.world_preview_info(uuid), public.world_preview_wiki(uuid), public.world_preview_wiki_page(uuid),
  public.world_preview_characters(uuid), public.world_preview_scenes(uuid), public.world_preview_scene(uuid) to authenticated;

-- Übersicht: jetzt auch mit Vorschau-Einstellung
drop function if exists public.public_worlds_overview();
create or replace function public.public_worlds_overview()
returns table (
  id uuid, name text, description text, cover_image_url text, is_demo boolean, member_count bigint, scene_count bigint,
  last_activity timestamptz, is_member boolean, join_mode text, has_request boolean, created_by uuid, preview text
)
language sql stable security definer set search_path = public
as $$
  select
    w.id, w.name, w.description, w.cover_image_url, w.is_demo,
    (select count(*) from public.world_members m where m.world_id = w.id) as member_count,
    (select count(*) from public.story_posts s where s.world_id = w.id and not s.is_private) as scene_count,
    greatest(
      w.created_at,
      (select max(s.created_at) from public.story_posts s where s.world_id = w.id and not s.is_private),
      (select max(e.created_at) from public.story_entries e join public.story_posts s on s.id = e.story_post_id where s.world_id = w.id and not s.is_private)
    ) as last_activity,
    exists (select 1 from public.world_members m where m.world_id = w.id and m.user_id = auth.uid()) as is_member,
    w.join_mode,
    exists (select 1 from public.world_join_requests r where r.world_id = w.id and r.user_id = auth.uid() and r.status = 'pending') as has_request,
    w.created_by,
    w.preview
  from public.worlds w
  where w.is_public or w.is_demo
  order by w.is_demo desc, last_activity desc nulls last;
$$;
revoke execute on function public.public_worlds_overview() from public, anon;
grant execute on function public.public_worlds_overview() to authenticated;

notify pgrst, 'reload schema';
