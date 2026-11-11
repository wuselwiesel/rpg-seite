-- „Session beenden“ in einer Szene: Rückblick mit Statistik und Bewertung (Sterne, was gefiel, was weniger).
-- Eine Szene kann viele Sessions haben; eine Session umfasst alles seit dem Ende der vorigen (oder seit Szenenbeginn).
-- Beenden löst nichts an der Szene aus (nicht gesperrt, nichts archiviert). Bewertungen sehen alle, die die Szene sehen dürfen.

create table if not exists public.scene_sessions (
  id uuid primary key default gen_random_uuid(),
  story_post_id uuid not null references public.story_posts (id) on delete cascade,
  ended_by uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null default now(),
  -- Momentaufnahme beim Beenden: { messages, words, rolls, first_at, last_at, characters: [{ id, name, count }] }
  stats jsonb not null default '{}'::jsonb
);

-- Der automatisch angelegte Beitrag in der Redaktion (null: keiner, z. B. bei geheimen Szenen oder gelöschtem Beitrag)
alter table public.scene_sessions add column if not exists redaktion_post_id uuid references public.redaktion_posts (id) on delete set null;

create index if not exists scene_sessions_scene_idx on public.scene_sessions (story_post_id, ended_at desc);

create table if not exists public.scene_session_ratings (
  session_id uuid not null references public.scene_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Charakter, mit dem die Person in dieser Welt gerade unterwegs ist (für die Anzeige des Namens)
  character_id uuid references public.characters (id) on delete set null,
  stars smallint not null check (stars between 1 and 5),
  liked text check (liked is null or char_length(liked) <= 600),
  disliked text check (disliked is null or char_length(disliked) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

alter table public.scene_sessions enable row level security;
alter table public.scene_session_ratings enable row level security;

-- Lesen: wer die Szene sehen darf (die Unterabfrage läuft mit den Rechten der Person, also mit den Regeln für story_posts)
drop policy if exists "scene_sessions_select" on public.scene_sessions;
create policy "scene_sessions_select" on public.scene_sessions
  for select to authenticated
  using (exists (select 1 from public.story_posts sp where sp.id = story_post_id));

drop policy if exists "scene_session_ratings_select" on public.scene_session_ratings;
create policy "scene_session_ratings_select" on public.scene_session_ratings
  for select to authenticated
  using (exists (select 1 from public.scene_sessions s where s.id = session_id));

-- Bewerten: nur die eigene Zeile, nur für Sessions einer sichtbaren Szene
drop policy if exists "scene_session_ratings_insert" on public.scene_session_ratings;
create policy "scene_session_ratings_insert" on public.scene_session_ratings
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.scene_sessions s where s.id = session_id));

drop policy if exists "scene_session_ratings_update" on public.scene_session_ratings;
create policy "scene_session_ratings_update" on public.scene_session_ratings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "scene_session_ratings_delete" on public.scene_session_ratings;
create policy "scene_session_ratings_delete" on public.scene_session_ratings
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Text für den Redaktions-Beitrag: Szene, Zahlen, Verteilung auf die Charaktere und Sterne-Durchschnitt (ohne die freien Bewertungstexte).
-- Wird komplett hier gebaut und maskiert, damit nichts von außen in fremde Beiträge geschrieben werden kann.
create or replace function public.scene_session_html_escape(p_text text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(coalesce(p_text, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

create or replace function public.scene_session_post_html(p_session_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s public.scene_sessions%rowtype;
  v_title text;
  v_msgs int;
  v_words int;
  v_rolls int;
  v_chars int;
  v_minutes int;
  v_dur text;
  v_names text;
  v_n int;
  v_avg numeric;
  v_round int;
  v_html text;
begin
  select * into s from public.scene_sessions where id = p_session_id;
  if s.id is null then return null; end if;
  select title into v_title from public.story_posts where id = s.story_post_id;

  v_msgs := coalesce((s.stats ->> 'messages')::int, 0);
  v_words := coalesce((s.stats ->> 'words')::int, 0);
  v_rolls := coalesce((s.stats ->> 'rolls')::int, 0);
  select count(*) into v_chars from jsonb_array_elements(coalesce(s.stats -> 'characters', '[]'::jsonb)) c where c ->> 'id' is not null;
  v_minutes := greatest(0, round(extract(epoch from ((s.stats ->> 'last_at')::timestamptz - (s.stats ->> 'first_at')::timestamptz)) / 60))::int;
  v_dur := case
    when v_minutes < 1 then 'unter 1 Min.'
    when v_minutes >= 60 then (v_minutes / 60)::text || ' Std.' || case when v_minutes % 60 > 0 then ' ' || (v_minutes % 60)::text || ' Min.' else '' end
    else v_minutes::text || ' Min.'
  end;
  select string_agg(public.scene_session_html_escape(x.name) || ' ' || x.count::text, ' · ' order by x.count desc)
    into v_names
    from jsonb_to_recordset(coalesce(s.stats -> 'characters', '[]'::jsonb)) as x(name text, count int);

  select count(*), avg(stars) into v_n, v_avg from public.scene_session_ratings where session_id = p_session_id;

  v_html := '<p><strong>Session beendet: „' || public.scene_session_html_escape(v_title) || '“</strong></p>'
    || '<p>' || v_msgs::text || case when v_msgs = 1 then ' Nachricht' else ' Nachrichten' end
    || ' von ' || v_chars::text || case when v_chars = 1 then ' Charakter' else ' Charakteren' end
    || ', ' || v_words::text || ' Wörter, ' || v_dur
    || case when v_rolls > 0 then ', ' || v_rolls::text || case when v_rolls = 1 then ' Wurf' else ' Würfe' end else '' end
    || '</p>';
  if v_names is not null then
    v_html := v_html || '<p>' || v_names || '</p>';
  end if;
  if v_n > 0 then
    v_round := round(v_avg)::int;
    v_html := v_html || '<p>Bewertung: ' || repeat('★', v_round) || repeat('☆', 5 - v_round)
      || ' Ø ' || replace(round(v_avg, 1)::text, '.', ',') || ' von 5 (' || v_n::text || case when v_n = 1 then ' Bewertung' else ' Bewertungen' end || ')</p>';
  else
    v_html := v_html || '<p>Noch keine Bewertung.</p>';
  end if;
  return v_html;
end;
$$;

-- Neue oder geänderte Bewertung: Sterne-Durchschnitt im Redaktions-Beitrag nachziehen (ohne ihn als „bearbeitet“ zu markieren)
create or replace function public.scene_session_ratings_refresh_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid := coalesce(new.session_id, old.session_id);
  v_post uuid;
begin
  select redaktion_post_id into v_post from public.scene_sessions where id = v_session;
  if v_post is not null then
    update public.redaktion_posts set content = public.scene_session_post_html(v_session) where id = v_post;
  end if;
  return null;
end;
$$;

revoke execute on function public.scene_session_ratings_refresh_post() from public, anon, authenticated;
revoke execute on function public.scene_session_post_html(uuid) from public, anon, authenticated;

drop trigger if exists scene_session_ratings_refresh_post on public.scene_session_ratings;
create trigger scene_session_ratings_refresh_post
  after insert or update or delete on public.scene_session_ratings
  for each row execute function public.scene_session_ratings_refresh_post();

-- Session beenden: rechnet die Statistik selbst aus (der Client kann nichts Falsches eintragen).
-- Erlaubt für alle, die in der Szene mitspielen (Autor:in, Schreibende, „mit dabei“). Leere Sessions und
-- doppeltes Beenden innerhalb einer Minute werden abgelehnt.
create or replace function public.end_scene_session(p_story_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.story_posts%rowtype;
  v_from timestamptz;
  v_last_end timestamptz;
  v_first boolean;
  v_stats jsonb;
  v_messages int;
  v_id uuid;
  v_redaktion uuid;
begin
  select * into v_post from public.story_posts where id = p_story_post_id;
  if v_post.id is null then raise exception 'Szene nicht gefunden'; end if;

  if not exists (
    select 1 from public.characters c
    where c.owner_id = auth.uid()
      and (
        c.id = v_post.character_id
        or c.id in (select character_id from public.story_entries where story_post_id = v_post.id)
        or c.id in (select character_id from public.story_post_cast where story_post_id = v_post.id)
      )
  ) then
    raise exception 'Keine Berechtigung';
  end if;

  select max(ended_at) into v_last_end from public.scene_sessions where story_post_id = v_post.id;
  if v_last_end is not null and v_last_end > now() - interval '1 minute' then
    raise exception 'Die Session wurde gerade eben schon beendet';
  end if;
  v_first := v_last_end is null;
  v_from := coalesce(v_last_end, v_post.created_at - interval '1 second');

  with e as (
    select character_id, kind, content, created_at, roll_label, coalesce(roll_secret, false) as secret
    from public.story_entries
    where story_post_id = v_post.id and coalesce(kind, 'entry') <> 'chapter' and created_at > v_from
  ),
  -- Der Szenenanfang zählt zur ersten Session
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
  values (v_post.id, auth.uid(), v_from, v_stats)
  returning id into v_id;

  -- Rückblick automatisch in der Redaktion posten, im Namen der Person, die beendet hat (geheime Szenen nicht).
  -- Ohne Meldung an Freund:innen: der Beitrag erscheint nur im Feed.
  if not v_post.is_private then
    insert into public.redaktion_posts (author_id, content, story_post_id)
    values (auth.uid(), public.scene_session_post_html(v_id), v_post.id)
    returning id into v_redaktion;
    update public.scene_sessions set redaktion_post_id = v_redaktion where id = v_id;
  end if;
  return v_id;
end;
$$;

grant execute on function public.end_scene_session(uuid) to authenticated;
