-- Erkunden: die Vorschau-Figur liefert auch die Naturen der Welt (für die Anzeige der Besonderen Natur im ChaBo).
drop function if exists public.world_preview_character(uuid);
create function public.world_preview_character(p_char uuid)
returns table (id uuid, world_id uuid, name text, username text, bio text, avatar_url text, banner_url text, is_npc boolean,
               theme_font text, theme_accent text, theme_bg text, post_count bigint, follower_count bigint, following_count bigint,
               has_sheet boolean, dice_enabled boolean, preview text, talent_config jsonb, nature_config jsonb)
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
         coalesce(w.dice_enabled, true), w.preview, w.talent_config, w.nature_config
  from public.characters c join public.worlds w on w.id = c.world_id
  where c.id = p_char and w.preview <> 'none' and c.deleted_at is null;
$$;

revoke execute on function public.world_preview_character(uuid) from public, anon;
grant execute on function public.world_preview_character(uuid) to authenticated;

notify pgrst, 'reload schema';
