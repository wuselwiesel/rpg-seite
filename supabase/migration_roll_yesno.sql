-- Ja/Nein-Wurf und geheime Würfe in Szenen.
-- roll_kind = 'yesno': Wurf ohne Zahlen, Ergebnis Ja (roll_success = true) oder Nein (false).
-- roll_secret: der Wurf ist nur für die Person sichtbar, der die würfelnde Figur gehört (Lesezugriff über die Zeilenregel, nicht nur in der Oberfläche).
alter table public.story_entries add column if not exists roll_kind text;
alter table public.story_entries add column if not exists roll_secret boolean not null default false;
alter table public.story_entries add constraint story_entries_roll_kind_check check (roll_kind is null or roll_kind = 'yesno');
alter table public.story_entries add constraint story_entries_secret_needs_roll check (not roll_secret or roll_label is not null);

alter policy story_entries_select_member on public.story_entries using (
  exists (
    select 1 from public.story_posts sp
    where sp.id = story_entries.story_post_id
      and public.is_world_member(sp.world_id)
      and ((not sp.is_private) or public.can_view_private_story_post(sp.id, sp.character_id))
  )
  and (
    not roll_secret
    or exists (select 1 from public.characters c where c.id = story_entries.character_id and c.owner_id = (select auth.uid()))
  )
);

-- Vorschau für Besucher:innen (läuft mit erhöhten Rechten): geheime Würfe nie zeigen oder mitzählen
create or replace function public.world_preview_scene(p_story uuid)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'id', s.id, 'world_id', s.world_id, 'title', s.title, 'content', s.content, 'location', s.location, 'created_at', s.created_at,
    'author', c.name,
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'content', e.content, 'created_at', e.created_at, 'author', ec.name, 'avatar_url', ec.avatar_url, 'kind', e.kind, 'roll_label', e.roll_label) order by e.created_at)
      from (select * from public.story_entries x where x.story_post_id = s.id and not x.roll_secret order by x.created_at limit 200) e
      left join public.characters ec on ec.id = e.character_id
    ), '[]'::jsonb)
  )
  from public.story_posts s join public.worlds w on w.id = s.world_id left join public.characters c on c.id = s.character_id
  where s.id = p_story and w.preview = 'full' and not s.is_private;
$function$;

create or replace function public.world_preview_scenes(p_world uuid)
returns table(id uuid, title text, content text, author_name text, author_avatar_url text, created_at timestamp with time zone, entry_count bigint, location text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select s.id, s.title, s.content, c.name, c.avatar_url, s.created_at,
         (select count(*) from public.story_entries e where e.story_post_id = s.id and e.kind is distinct from 'chapter' and not e.roll_secret),
         s.location
  from public.story_posts s join public.worlds w on w.id = s.world_id left join public.characters c on c.id = s.character_id
  where s.world_id = p_world and w.preview = 'full' and not s.is_private and not s.archived
  order by s.created_at desc
  limit 100;
$function$;
