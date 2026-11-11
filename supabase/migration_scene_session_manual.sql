-- Sessions: (1) Der Rückblick wird nicht mehr automatisch in der Redaktion gepostet, sondern von Hand (post_scene_session).
-- (2) Den Anfang der nächsten Session kann man an einer Nachricht festlegen (set_scene_session_start); ohne eigene Wahl
-- beginnt sie, wo die letzte endete (bzw. am Szenenanfang). Baut auf migration_scene_sessions.sql auf.

-- Gehört die Person zu den Mitspielenden der Szene? (Autor:in, Schreibende, „mit dabei“)
create or replace function public.is_scene_participant(p_story_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.story_posts sp
    join public.characters c on c.owner_id = auth.uid()
    where sp.id = p_story_post_id
      and (
        c.id = sp.character_id
        or c.id in (select character_id from public.story_entries where story_post_id = sp.id)
        or c.id in (select character_id from public.story_post_cast where story_post_id = sp.id)
      )
  );
$$;

grant execute on function public.is_scene_participant(uuid) to authenticated;

-- Gewählter Anfang der nächsten Session (höchstens einer je Szene; wird beim Beenden verbraucht)
create table if not exists public.scene_session_starts (
  story_post_id uuid primary key references public.story_posts (id) on delete cascade,
  start_at timestamptz not null,
  entry_id uuid references public.story_entries (id) on delete set null,
  set_by uuid not null references auth.users (id) on delete cascade,
  set_at timestamptz not null default now()
);

alter table public.scene_session_starts enable row level security;

drop policy if exists "scene_session_starts_select" on public.scene_session_starts;
create policy "scene_session_starts_select" on public.scene_session_starts
  for select to authenticated
  using (exists (select 1 from public.story_posts sp where sp.id = story_post_id));

-- Anfang setzen (p_entry_id) oder entfernen (null). Nur Mitspielende; die Nachricht muss zur Szene gehören
-- und nach dem Ende der letzten Session liegen.
create or replace function public.set_scene_session_start(p_story_post_id uuid, p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz;
  v_kind text;
  v_last_end timestamptz;
begin
  if not public.is_scene_participant(p_story_post_id) then raise exception 'Keine Berechtigung'; end if;

  if p_entry_id is null then
    delete from public.scene_session_starts where story_post_id = p_story_post_id;
    return;
  end if;

  select created_at, kind into v_at, v_kind from public.story_entries where id = p_entry_id and story_post_id = p_story_post_id;
  if v_at is null then raise exception 'Nachricht nicht gefunden'; end if;
  if coalesce(v_kind, 'entry') = 'chapter' then raise exception 'Ein Kapitel kann kein Session-Anfang sein'; end if;

  select max(ended_at) into v_last_end from public.scene_sessions where story_post_id = p_story_post_id;
  if v_last_end is not null and v_at <= v_last_end then
    raise exception 'Der Anfang muss nach dem Ende der letzten Session liegen';
  end if;

  insert into public.scene_session_starts (story_post_id, start_at, entry_id, set_by)
  values (p_story_post_id, v_at, p_entry_id, auth.uid())
  on conflict (story_post_id) do update
    set start_at = excluded.start_at, entry_id = excluded.entry_id, set_by = excluded.set_by, set_at = now();
end;
$$;

grant execute on function public.set_scene_session_start(uuid, uuid) to authenticated;

-- Session beenden: wie bisher, aber ohne automatischen Redaktions-Beitrag; beginnt beim gewählten Anfang,
-- sonst beim Ende der letzten Session (bzw. am Szenenanfang).
create or replace function public.end_scene_session(p_story_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.story_posts%rowtype;
  v_from timestamptz;
  v_started timestamptz;
  v_last_end timestamptz;
  v_start_at timestamptz;
  v_first boolean;
  v_stats jsonb;
  v_messages int;
  v_id uuid;
begin
  select * into v_post from public.story_posts where id = p_story_post_id;
  if v_post.id is null then raise exception 'Szene nicht gefunden'; end if;
  if not public.is_scene_participant(v_post.id) then raise exception 'Keine Berechtigung'; end if;

  select max(ended_at) into v_last_end from public.scene_sessions where story_post_id = v_post.id;
  if v_last_end is not null and v_last_end > now() - interval '1 minute' then
    raise exception 'Die Session wurde gerade eben schon beendet';
  end if;

  select start_at into v_start_at from public.scene_session_starts where story_post_id = v_post.id;
  if v_start_at is not null and (v_last_end is null or v_start_at > v_last_end) then
    -- gewählter Anfang: diese Nachricht gehört dazu
    v_started := v_start_at;
    v_from := v_start_at - interval '1 microsecond';
    v_first := false;
  else
    v_first := v_last_end is null;
    v_from := coalesce(v_last_end, v_post.created_at - interval '1 second');
    v_started := v_from;
  end if;

  with e as (
    select character_id, kind, content, created_at, roll_label, coalesce(roll_secret, false) as secret
    from public.story_entries
    where story_post_id = v_post.id and coalesce(kind, 'entry') <> 'chapter' and created_at > v_from
  ),
  allmsg as (
    select character_id, 'entry'::text as kind, content, created_at, null::text as roll_label, false as secret
    from public.story_posts where id = v_post.id and v_first
    union all
    select character_id, kind, content, created_at, roll_label, secret from e
  ),
  per as (
    select
      case when m.kind = 'narrator' then null else m.character_id end as cid,
      count(*) filter (where m.roll_label is null) as n
    from allmsg m
    group by 1
  )
  select
    jsonb_build_object(
      'messages', (select count(*) from allmsg where roll_label is null),
      'words', coalesce((
        select sum(coalesce(array_length(regexp_split_to_array(nullif(trim(regexp_replace(content, '<[^>]*>', ' ', 'g')), ''), '\s+'), 1), 0))
        from allmsg where roll_label is null
      ), 0),
      'rolls', (select count(*) from allmsg where roll_label is not null and not secret),
      'first_at', (select min(created_at) from allmsg),
      'last_at', (select max(created_at) from allmsg),
      'characters', coalesce((
        select jsonb_agg(jsonb_build_object('id', per.cid, 'name', coalesce(ch.name, 'Erzähler:in'), 'count', per.n) order by per.n desc)
        from per left join public.characters ch on ch.id = per.cid
        where per.n > 0
      ), '[]'::jsonb)
    ),
    (select count(*) from allmsg where roll_label is null)
  into v_stats, v_messages;

  if v_messages = 0 then raise exception 'Seit dem letzten Beenden wurde nichts geschrieben'; end if;

  insert into public.scene_sessions (story_post_id, ended_by, started_at, stats)
  values (v_post.id, auth.uid(), v_started, v_stats)
  returning id into v_id;

  -- Der gewählte Anfang ist verbraucht (auch ein veralteter wird aufgeräumt)
  delete from public.scene_session_starts where story_post_id = v_post.id;
  return v_id;
end;
$$;

grant execute on function public.end_scene_session(uuid) to authenticated;

-- Rückblick von Hand in der Redaktion posten: im Namen der Person, die auf den Knopf drückt; nur Mitspielende,
-- nicht bei geheimen Szenen, nur einmal je Session. Der Sterne-Durchschnitt im Beitrag wird weiter vom Trigger aktuell gehalten.
create or replace function public.post_scene_session(p_session_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.scene_sessions%rowtype;
  v_private boolean;
  v_post uuid;
begin
  select * into s from public.scene_sessions where id = p_session_id;
  if s.id is null then raise exception 'Session nicht gefunden'; end if;
  if not public.is_scene_participant(s.story_post_id) then raise exception 'Keine Berechtigung'; end if;
  select is_private into v_private from public.story_posts where id = s.story_post_id;
  if v_private then raise exception 'Geheime Szenen lassen sich nicht in der Redaktion posten'; end if;
  if s.redaktion_post_id is not null then raise exception 'Dieser Rückblick wurde schon in der Redaktion gepostet'; end if;

  insert into public.redaktion_posts (author_id, content, story_post_id)
  values (auth.uid(), public.scene_session_post_html(s.id), s.story_post_id)
  returning id into v_post;
  update public.scene_sessions set redaktion_post_id = v_post where id = s.id;
  return v_post;
end;
$$;

grant execute on function public.post_scene_session(uuid) to authenticated;
