-- Kapitel INNERHALB einer Szene, Schritt 1: anlegen (am Ende oder vor einer Nachricht) und den Namen von Kapitel 1 (Szenenanfang) festhalten.
-- Baut auf migration_scene_session_manual.sql auf (is_scene_participant). Eine Kapitel-Marke ist weiter eine Zeile in story_entries mit kind = 'chapter';
-- ihre Stelle bestimmt created_at, deshalb setzt scene_slot_before den Zeitpunkt genau zwischen die Vorgängernachricht und die gewählte Nachricht.

-- Kapitel 1 = Szenenanfang: Name und Bezeichnung (leer = „Anfang“). Nur sichtbar, sobald die Szene mindestens eine Kapitel-Marke hat.
alter table public.story_posts
  add column if not exists chapter_one_title text,
  add column if not exists chapter_one_label text;

alter table public.story_posts drop constraint if exists story_posts_chapter_one_len;
alter table public.story_posts
  add constraint story_posts_chapter_one_len check (
    (chapter_one_title is null or char_length(chapter_one_title) <= 100)
    and (chapter_one_label is null or char_length(chapter_one_label) <= 40)
  );

-- Zeitpunkt unmittelbar vor einer Nachricht: in der Mitte zwischen der davor liegenden Nachricht (bzw. dem Szenenbeginn) und der gewählten.
-- p_exclude lässt eine Nachricht außer Acht (Kapitel verschieben, Schritt 2).
create or replace function public.scene_slot_before(p_story_post_id uuid, p_before_entry uuid, p_exclude uuid default null)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_target timestamptz;
  v_kind text;
  v_prev timestamptz;
  v_start timestamptz;
  v_lower timestamptz;
  v_at timestamptz;
begin
  select created_at, kind into v_target, v_kind from public.story_entries where id = p_before_entry and story_post_id = p_story_post_id;
  if v_target is null then raise exception 'Nachricht nicht gefunden'; end if;
  if coalesce(v_kind, 'entry') = 'chapter' then raise exception 'Vor einem Kapitel kann kein weiteres beginnen'; end if;

  select max(created_at) into v_prev from public.story_entries
    where story_post_id = p_story_post_id and created_at < v_target and (p_exclude is null or id <> p_exclude);
  select created_at into v_start from public.story_posts where id = p_story_post_id;
  v_lower := coalesce(v_prev, v_start);

  if v_lower is null or v_lower >= v_target then
    v_at := v_target - interval '1 millisecond';
  else
    v_at := v_lower + (v_target - v_lower) / 2;
  end if;
  if v_at >= v_target or (v_prev is not null and v_at <= v_prev) then raise exception 'Die Nachrichten liegen zeitlich zu dicht beieinander'; end if;
  return v_at;
end;
$$;

revoke execute on function public.scene_slot_before(uuid, uuid, uuid) from public, anon, authenticated;

-- Kapitel anlegen: am Ende der Szene (p_before_entry null) oder unmittelbar vor einer Nachricht. Alle Mitspielenden der Szene dürfen das,
-- auch in abgeschlossenen Szenen (nachträgliches Einteilen). Die Marke gehört dem eigenen Charakter der Person (zuletzt schreibend in der Szene).
create or replace function public.insert_scene_chapter(
  p_story_post_id uuid,
  p_before_entry uuid,
  p_title text,
  p_label text,
  p_summary text,
  p_year integer,
  p_month smallint,
  p_day smallint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.story_posts%rowtype;
  v_title text := left(btrim(coalesce(p_title, '')), 100);
  v_char uuid;
  v_at timestamptz;
  v_id uuid;
begin
  select * into v_post from public.story_posts where id = p_story_post_id;
  if v_post.id is null then raise exception 'Szene nicht gefunden'; end if;
  if not public.is_scene_participant(v_post.id) then raise exception 'Keine Berechtigung'; end if;
  if v_title = '' then raise exception 'Kapitelname fehlt'; end if;

  select c.id into v_char
  from public.characters c
  where c.owner_id = auth.uid() and c.world_id = v_post.world_id and c.deleted_at is null
  order by (c.id in (select e.character_id from public.story_entries e where e.story_post_id = v_post.id)) desc,
           (c.id = v_post.character_id) desc,
           c.is_npc asc,
           c.created_at asc
  limit 1;
  if v_char is null then raise exception 'Kein Charakter in dieser Welt'; end if;

  if p_before_entry is null then
    v_at := now();
  else
    v_at := public.scene_slot_before(v_post.id, p_before_entry);
  end if;

  insert into public.story_entries (story_post_id, character_id, content, kind, chapter_title, chapter_summary, chapter_label, event_year, event_month, event_day, created_at)
  values (
    v_post.id, v_char, v_title, 'chapter', v_title,
    nullif(left(btrim(coalesce(p_summary, '')), 1500), ''),
    nullif(left(regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g'), 40), ''),
    p_year, p_month, p_day, v_at
  )
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.insert_scene_chapter(uuid, uuid, text, text, text, integer, smallint, smallint) to authenticated;

-- Name und Bezeichnung von Kapitel 1 (Szenenanfang); leere Werte setzen auf „Anfang“ zurück
create or replace function public.set_scene_chapter_one(p_story_post_id uuid, p_title text, p_label text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_scene_participant(p_story_post_id) then raise exception 'Keine Berechtigung'; end if;
  update public.story_posts
    set chapter_one_title = nullif(left(btrim(coalesce(p_title, '')), 100), ''),
        chapter_one_label = nullif(left(regexp_replace(btrim(coalesce(p_label, '')), '\s+', ' ', 'g'), 40), '')
    where id = p_story_post_id;
end;
$$;

grant execute on function public.set_scene_chapter_one(uuid, text, text) to authenticated;

-- Kapitel-Marken entfernen dürfen auch die Autor:in der Szene und die Welt-Besitzer:in (bisher nur die Person, die sie angelegt hat)
drop policy if exists "story_entries_delete_chapter_staff" on public.story_entries;
create policy "story_entries_delete_chapter_staff" on public.story_entries
  for delete to authenticated using (
    kind = 'chapter' and (
      exists (select 1 from public.story_posts sp join public.characters c on c.id = sp.character_id where sp.id = story_post_id and c.owner_id = auth.uid())
      or exists (select 1 from public.story_posts sp join public.worlds w on w.id = sp.world_id where sp.id = story_post_id and w.created_by = auth.uid())
    )
  );

notify pgrst, 'reload schema';
