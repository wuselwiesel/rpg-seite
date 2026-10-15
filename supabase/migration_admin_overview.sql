-- Überblick für App-Admins: Zahlen zur App als ein JSON (nur Aggregate und Kontonamen, nie Inhalte).
-- Testkonten (kind = 'test'), das offizielle Konto und das Papierkorb-Konto zählen nicht mit.
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not public.is_app_admin() then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;

  with real_accounts as (
    select p.* from public.profiles p
    where not exists (select 1 from public.account_marks m where m.user_id = p.id and m.kind in ('test', 'official'))
      and lower(p.username) <> 'geloescht'
  ),
  days as (
    select d::date as day from generate_series((now() - interval '29 days')::date, now()::date, interval '1 day') d
  )
  select jsonb_build_object(
    'accounts', jsonb_build_object(
      'total', (select count(*) from real_accounts),
      'new_24h', (select count(*) from real_accounts where created_at > now() - interval '24 hours'),
      'new_7d', (select count(*) from real_accounts where created_at > now() - interval '7 days'),
      'new_30d', (select count(*) from real_accounts where created_at > now() - interval '30 days'),
      'with_character', (select count(*) from real_accounts a where exists (select 1 from public.characters c where c.owner_id = a.id and c.deleted_at is null and coalesce(c.is_npc, false) = false)),
      'wrote_something', (select count(*) from real_accounts a where exists (
          select 1 from public.characters c where c.owner_id = a.id and (
            exists (select 1 from public.posts x where x.character_id = c.id)
            or exists (select 1 from public.story_entries e where e.character_id = c.id)
            or exists (select 1 from public.messages m where m.character_id = c.id)))
        or exists (select 1 from public.redaktion_posts r where r.author_id = a.id)),
      'in_world', (select count(*) from real_accounts a where exists (select 1 from public.world_members wm where wm.user_id = a.id))
    ),
    'registrations_per_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'n', (select count(*) from real_accounts a where a.created_at::date = d.day)) order by d.day), '[]'::jsonb)
      from days d
    ),
    'active', jsonb_build_object(
      'online_now', (select count(*) from real_accounts where last_seen_at > now() - interval '5 minutes'),
      'day', (select count(*) from real_accounts where last_seen_at > now() - interval '24 hours'),
      'week', (select count(*) from real_accounts where last_seen_at > now() - interval '7 days'),
      'month', (select count(*) from real_accounts where last_seen_at > now() - interval '30 days')
    ),
    'content', jsonb_build_object(
      'worlds', (select count(*) from public.worlds w where coalesce(w.is_demo, false) = false and w.created_by in (select id from real_accounts)),
      'worlds_public', (select count(*) from public.worlds w where w.is_public and coalesce(w.is_demo, false) = false and w.created_by in (select id from real_accounts)),
      'worlds_explorable', (select count(*) from public.worlds w where w.preview <> 'none' and coalesce(w.is_demo, false) = false and w.created_by in (select id from real_accounts)),
      'characters', (select count(*) from public.characters c where c.deleted_at is null and coalesce(c.is_npc, false) = false and c.owner_id in (select id from real_accounts)),
      'npcs', (select count(*) from public.characters c where c.deleted_at is null and coalesce(c.is_npc, false) and c.owner_id in (select id from real_accounts)),
      'posts_7d', (select count(*) from public.posts x join public.characters c on c.id = x.character_id where x.created_at > now() - interval '7 days' and c.owner_id in (select id from real_accounts)),
      'scene_entries_7d', (select count(*) from public.story_entries e join public.characters c on c.id = e.character_id where e.created_at > now() - interval '7 days' and c.owner_id in (select id from real_accounts)),
      'messages_7d', (select count(*) from public.messages m join public.characters c on c.id = m.character_id where m.created_at > now() - interval '7 days' and c.owner_id in (select id from real_accounts)),
      'redaktion_posts_7d', (select count(*) from public.redaktion_posts r where r.created_at > now() - interval '7 days' and r.author_id in (select id from real_accounts))
    ),
    'recent_signups', (
      select coalesce(jsonb_agg(row_to_json(s)), '[]'::jsonb) from (
        select a.username, a.nickname, a.created_at, a.last_seen_at,
               exists (select 1 from public.characters c where c.owner_id = a.id and c.deleted_at is null and coalesce(c.is_npc, false) = false) as has_character,
               exists (select 1 from public.world_members wm where wm.user_id = a.id) as in_world
        from real_accounts a order by a.created_at desc limit 10
      ) s
    )
  ) into v;

  return v;
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

notify pgrst, 'reload schema';
