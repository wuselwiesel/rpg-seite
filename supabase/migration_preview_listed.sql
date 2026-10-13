-- Eine Welt mit eingeschaltetem „Erkunden“ (Info oder alles) erscheint auch unter „Welten entdecken“, selbst wenn sie nicht
-- „Öffentlich“ ist und nur auf Einladung beitritt: Wer anderen das Ansehen erlaubt, will auch gefunden werden.
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
  where w.is_public or w.is_demo or w.preview <> 'none'
  order by w.is_demo desc, last_activity desc nulls last;
$$;
revoke execute on function public.public_worlds_overview() from public, anon;
grant execute on function public.public_worlds_overview() to authenticated;

notify pgrst, 'reload schema';
