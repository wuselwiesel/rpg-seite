-- Mehrere Handlungsstränge je Szene. `story_posts.arc_id` bleibt der erste Strang (Buch, Zeitleiste, Abwärtskompatibilität).
create table if not exists public.story_post_arcs (
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  arc_id uuid not null references public.story_arcs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_post_id, arc_id)
);
create index if not exists story_post_arcs_arc_idx on public.story_post_arcs (arc_id);
alter table public.story_post_arcs enable row level security;

-- Lesen: wer die Szene sehen darf (RLS auf story_posts greift in der Unterabfrage)
drop policy if exists "story_post_arcs_select" on public.story_post_arcs;
create policy "story_post_arcs_select" on public.story_post_arcs
  for select to authenticated using (exists (select 1 from public.story_posts p where p.id = story_post_id));

-- Bestehende Zuordnungen übernehmen
insert into public.story_post_arcs (story_post_id, arc_id)
select id, arc_id from public.story_posts where arc_id is not null
on conflict do nothing;

create or replace function public.set_scene_arcs(p_story_post_id uuid, p_arc_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_world uuid;
  v_private boolean;
  v_ids uuid[];
begin
  select world_id, is_private into v_world, v_private from public.story_posts where id = p_story_post_id;
  if v_world is null then
    raise exception 'Szene nicht gefunden';
  end if;
  if not (
    exists (select 1 from public.characters c where c.owner_id = auth.uid() and c.world_id = v_world and c.deleted_at is null)
    or public.is_world_admin(v_world)
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if v_private and not (
    exists (select 1 from public.story_posts p join public.characters c on c.id = p.character_id where p.id = p_story_post_id and c.owner_id = auth.uid())
    or exists (select 1 from public.story_post_viewers v join public.characters c on c.id = v.character_id where v.story_post_id = p_story_post_id and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = auth.uid())
  ) then
    raise exception 'Keine Berechtigung';
  end if;

  -- nur Stränge dieser Welt, ohne Doppelte, Reihenfolge bleibt, höchstens 12
  select coalesce(array_agg(id order by ord), '{}') into v_ids
  from (
    select a.id, min(t.ord) as ord
    from unnest(coalesce(p_arc_ids, '{}')) with ordinality as t(id, ord)
    join public.story_arcs a on a.id = t.id and a.world_id = v_world
    group by a.id
    order by min(t.ord)
    limit 12
  ) s;

  delete from public.story_post_arcs where story_post_id = p_story_post_id and not (arc_id = any (v_ids));
  insert into public.story_post_arcs (story_post_id, arc_id)
  select p_story_post_id, unnest(v_ids)
  on conflict do nothing;
  update public.story_posts set arc_id = case when array_length(v_ids, 1) is null then null else v_ids[1] end where id = p_story_post_id;
end;
$$;
revoke all on function public.set_scene_arcs(uuid, uuid[]) from public, anon;
grant execute on function public.set_scene_arcs(uuid, uuid[]) to authenticated;

-- Der alte Aufruf (ein Strang) nutzt jetzt dieselbe Tabelle
create or replace function public.set_scene_arc(p_story_post_id uuid, p_arc_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  select public.set_scene_arcs(p_story_post_id, case when p_arc_id is null then '{}'::uuid[] else array[p_arc_id] end);
$$;
revoke all on function public.set_scene_arc(uuid, uuid) from public, anon;
grant execute on function public.set_scene_arc(uuid, uuid) to authenticated;
