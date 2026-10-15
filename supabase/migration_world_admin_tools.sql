-- Werkzeuge für Welt-Admins: Geheimes ein-/ausschalten, Meldungen über Ereignisse in der Welt, Übersicht mit Zahlen.

-- 1) Geheime Felder in dieser Welt erlaubt? Bestehende Welten bleiben auf „ja“.
alter table public.worlds add column if not exists allow_secrets boolean not null default true;

-- 2) Welche Admin-Meldungen hat eine Admin in einer Welt ausgeschaltet? (Standard: nichts, also alles an)
create table if not exists public.world_admin_notify_prefs (
  world_id uuid not null references public.worlds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  muted_events text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (world_id, user_id)
);

alter table public.world_admin_notify_prefs enable row level security;

drop policy if exists world_admin_notify_prefs_select on public.world_admin_notify_prefs;
create policy world_admin_notify_prefs_select on public.world_admin_notify_prefs
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists world_admin_notify_prefs_write on public.world_admin_notify_prefs;
create policy world_admin_notify_prefs_write on public.world_admin_notify_prefs
  for all to authenticated
  using (user_id = (select auth.uid()) and public.is_world_admin(world_id))
  with check (user_id = (select auth.uid()) and public.is_world_admin(world_id));

-- Wer in dieser Welt soll von diesem Ereignis erfahren? Besitzer:in und Admins, die es nicht ausgeschaltet haben,
-- ohne die auslösende Person. Aufrufen darf nur, wer selbst Mitglied der Welt ist.
create or replace function public.world_admin_recipients(p_world uuid, p_event text)
returns setof uuid
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_world_member(p_world) then
    return;
  end if;
  return query
    select r.uid
    from (
      select w.created_by as uid from public.worlds w where w.id = p_world
      union
      select wm.user_id from public.world_members wm where wm.world_id = p_world and wm.role = 'admin'
    ) r
    where r.uid <> auth.uid()
      and not exists (
        select 1 from public.world_admin_notify_prefs np
        where np.world_id = p_world and np.user_id = r.uid and p_event = any (np.muted_events)
      );
end;
$$;

revoke all on function public.world_admin_recipients(uuid, text) from public, anon;
grant execute on function public.world_admin_recipients(uuid, text) to authenticated;

-- 3) Übersicht einer Welt (nur Besitzer:in, Admins und App-Admins). Zahlen und Namen, nie Inhalte oder Geheimes im Einzelnen.
create or replace function public.world_overview(p_world uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
begin
  if not (public.is_world_admin(p_world) or public.is_app_admin()) then
    raise exception 'Keine Berechtigung' using errcode = '42501';
  end if;

  with
  w as (select * from public.worlds where id = p_world),
  chars as (
    select c.id, c.owner_id, c.name, c.choices, coalesce(c.is_npc, false) as is_npc
    from public.characters c where c.world_id = p_world and c.deleted_at is null
  ),
  writes as (
    select c.owner_id, c.id as character_id, x.created_at, 'post' as kind
      from chars c join public.posts x on x.character_id = c.id
    union all
    select c.owner_id, c.id, e.created_at, 'entry'
      from chars c join public.story_entries e on e.character_id = c.id
    union all
    select c.owner_id, c.id, m.created_at, 'message'
      from chars c join public.messages m on m.character_id = c.id
  ),
  mem as (
    select wm.user_id, wm.joined_at,
           case when wm.user_id = (select created_by from w) then 'owner' else wm.role end as role,
           p.username, p.nickname
    from public.world_members wm join public.profiles p on p.id = wm.user_id
    where wm.world_id = p_world
  )
  select jsonb_build_object(
    'members', jsonb_build_object(
      'total', (select count(*) from mem),
      'admins', (select count(*) from mem where role in ('owner', 'admin')),
      'new_7d', (select count(*) from mem where joined_at > now() - interval '7 days'),
      'new_30d', (select count(*) from mem where joined_at > now() - interval '30 days'),
      'pending_requests', (select count(*) from public.world_join_requests r where r.world_id = p_world and r.status = 'pending'),
      'list', (
        select coalesce(jsonb_agg(row_to_json(t) order by t.joined_at), '[]'::jsonb) from (
          select m.user_id, m.username, m.nickname, m.role, m.joined_at,
                 (select count(*) from chars c where c.owner_id = m.user_id and not c.is_npc) as characters,
                 (select count(*) from chars c where c.owner_id = m.user_id and c.is_npc) as npcs,
                 (select max(x.created_at) from writes x where x.owner_id = m.user_id) as last_written_at
          from mem m
        ) t
      )
    ),
    'characters', jsonb_build_object(
      'total', (select count(*) from chars where not is_npc),
      'npcs', (select count(*) from chars where is_npc),
      'lists', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', l.id, 'label', l.label, 'is_species', l.is_species, 'mode', l.mode,
          'options', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'label', o.label, 'max_count', o.max_count,
              'used', (select count(*) from chars c where c.choices ->> l.id::text = o.label)
            ) order by o.sort_order, o.label), '[]'::jsonb)
            from public.world_choice_options o where o.list_id = l.id
          )
        ) order by l.is_species desc, l.sort_order, l.label), '[]'::jsonb)
        from public.world_choice_lists l where l.world_id = p_world
      )
    ),
    'activity', jsonb_build_object(
      'posts_7d', (select count(*) from writes where kind = 'post' and created_at > now() - interval '7 days'),
      'scene_entries_7d', (select count(*) from writes where kind = 'entry' and created_at > now() - interval '7 days'),
      'messages_7d', (select count(*) from writes where kind = 'message' and created_at > now() - interval '7 days'),
      'scenes_active', (select count(*) from public.story_posts s where s.world_id = p_world and not s.archived),
      'scenes_archived', (select count(*) from public.story_posts s where s.world_id = p_world and s.archived),
      'top_writers', (
        select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
          select c.name, count(*) as n
          from writes x join chars c on c.id = x.character_id
          where x.created_at > now() - interval '7 days' and not c.is_npc
          group by c.id, c.name order by count(*) desc, c.name limit 5
        ) t
      )
    ),
    'content', jsonb_build_object(
      'wiki_pages', (select count(*) from public.wiki_pages p where p.world_id = p_world),
      'arcs', (select count(*) from public.story_arcs a where a.world_id = p_world),
      'relationships', (select count(*) from public.character_relationships r where r.world_id = p_world),
      'secret_entries', (
        select coalesce(sum(
          coalesce(jsonb_array_length(case when jsonb_typeof(s.data -> 'personalFields') = 'array' then s.data -> 'personalFields' end), 0)
          + coalesce(jsonb_array_length(case when jsonb_typeof(s.data -> 'family') = 'array' then s.data -> 'family' end), 0)
          + coalesce(jsonb_array_length(case when jsonb_typeof(s.data -> 'notesBlocks') = 'array' then s.data -> 'notesBlocks' end), 0)
        ), 0)
        from public.character_sheet_secrets s join chars c on c.id = s.character_id
      ) + (select count(*) from public.character_relationships r where r.world_id = p_world and r.is_secret)
    )
  ) into v;

  return v;
end;
$$;

revoke all on function public.world_overview(uuid) from public, anon;
grant execute on function public.world_overview(uuid) to authenticated;

notify pgrst, 'reload schema';
