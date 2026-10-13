-- Erkunden: Figuren lassen sich anklicken (Profil mit Beiträgen und ChaBo). Wie die übrigen Vorschau-Funktionen nur, wenn die Welt das
-- Erkunden erlaubt; Beiträge nur bei „alles“; ein ChaBo nur ohne Geheimes (das liegt in character_sheet_secrets und ist hier nie dabei).
create or replace function public.world_preview_character(p_char uuid)
returns table (id uuid, world_id uuid, name text, username text, bio text, avatar_url text, banner_url text, is_npc boolean,
               theme_font text, theme_accent text, theme_bg text, post_count bigint, follower_count bigint, following_count bigint,
               has_sheet boolean, dice_enabled boolean, preview text, talent_config jsonb)
language sql stable security definer set search_path = public
as $$
  select c.id, c.world_id, c.name, c.username, c.bio, c.avatar_url, c.banner_url, coalesce(c.is_npc, false),
         c.theme_font, c.theme_accent, c.theme_bg,
         case when w.preview = 'full'
              then (select count(*) from public.posts p where p.character_id = c.id and coalesce(p.publish_at, now()) <= now())
              else 0 end,
         (select count(*) from public.character_follows f where f.followed_id = c.id),
         (select count(*) from public.character_follows f where f.follower_id = c.id),
         exists (select 1 from public.character_sheets s where s.character_id = c.id),
         coalesce(w.dice_enabled, true), w.preview, w.talent_config
  from public.characters c join public.worlds w on w.id = c.world_id
  where c.id = p_char and w.preview <> 'none' and c.deleted_at is null;
$$;

create or replace function public.world_preview_character_sheet(p_char uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select s.data
  from public.character_sheets s
  join public.characters c on c.id = s.character_id
  join public.worlds w on w.id = c.world_id
  where s.character_id = p_char and w.preview <> 'none' and c.deleted_at is null;
$$;

create or replace function public.world_preview_character_posts(p_char uuid)
returns table (id uuid, content text, media_url text, media_type text, media_urls text[], created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.id, p.content, p.media_url, p.media_type, p.media_urls, p.created_at
  from public.posts p
  join public.characters c on c.id = p.character_id
  join public.worlds w on w.id = c.world_id
  where p.character_id = p_char and w.preview = 'full' and c.deleted_at is null and coalesce(p.publish_at, now()) <= now()
  order by p.created_at desc
  limit 60;
$$;

revoke execute on function public.world_preview_character(uuid), public.world_preview_character_sheet(uuid), public.world_preview_character_posts(uuid) from public, anon;
grant execute on function public.world_preview_character(uuid), public.world_preview_character_sheet(uuid), public.world_preview_character_posts(uuid) to authenticated;

notify pgrst, 'reload schema';
