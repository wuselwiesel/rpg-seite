-- Übungswelt: Beitritt macht niemanden zum Freund aller anderen, nächtliches Zurücksetzen.
create or replace function public.world_members_auto_friends()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- In der Übungswelt entstehen keine automatischen Freundschaften (sonst wären alle Übenden miteinander befreundet).
  if exists (select 1 from public.worlds w where w.id = new.world_id and w.is_demo) then
    return new;
  end if;
  insert into public.friendships (requester_id, addressee_id, status)
  select new.user_id, m.user_id, 'accepted'
  from public.world_members m
  where m.world_id = new.world_id
    and m.user_id <> new.user_id
    and not exists (
      select 1 from public.friendships f
      where (f.requester_id = new.user_id and f.addressee_id = m.user_id)
         or (f.requester_id = m.user_id and f.addressee_id = new.user_id)
    );

  update public.friendships f
  set status = 'accepted'
  where f.status = 'pending'
    and exists (
      select 1 from public.world_members m
      where m.world_id = new.world_id
        and m.user_id <> new.user_id
        and ((f.requester_id = new.user_id and f.addressee_id = m.user_id)
          or (f.requester_id = m.user_id and f.addressee_id = new.user_id))
    );
  return new;
end;
$$;
revoke execute on function public.world_members_auto_friends() from anon, authenticated, public;

-- Zeiten der Beispielinhalte relativ zu „jetzt“ setzen, damit der Feed lebendig aussieht (Nummer steckt in der festen ID).
create or replace function public.demo_world_refresh_dates()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_world uuid;
begin
  select id into v_world from public.worlds where is_demo limit 1;
  if v_world is null then return; end if;

  update public.posts p
  set created_at = now() - (('x' || substr(p.id::text, 27, 10))::bit(40)::bigint * interval '7 hours'), updated_at = null
  where p.id::text like 'de000000-%';

  update public.comments c
  set created_at = coalesce((select p.created_at from public.posts p where p.id = c.post_id), now())
        + (('x' || substr(c.id::text, 27, 10))::bit(40)::bigint * interval '40 minutes')
  where c.id::text like 'de000000-%';

  update public.story_posts s
  set created_at = now() - ((array['3 hours', '1 day', '9 days'])[('x' || substr(s.id::text, 27, 10))::bit(40)::bigint::int])::interval
  where s.id::text like 'de000000-%' and s.world_id = v_world;

  update public.story_entries e
  set created_at = (select s.created_at from public.story_posts s where s.id = e.story_post_id)
        + ((('x' || substr(e.id::text, 27, 10))::bit(40)::bigint % 100) * interval '23 minutes')
  where e.id::text like 'de000000-%';

  update public.wiki_pages w
  set created_at = now() - (('x' || substr(w.id::text, 27, 10))::bit(40)::bigint * interval '30 hours'),
      updated_at = now() - (('x' || substr(w.id::text, 27, 10))::bit(40)::bigint * interval '30 hours')
  where w.id::text like 'de000000-%' and w.world_id = v_world;
end;
$$;
revoke execute on function public.demo_world_refresh_dates() from anon, authenticated, public;

-- Räumt alles weg, was Übende in der Übungswelt angelegt haben; Beispielinhalt (IDs de000000-…) und Mitgliedschaften bleiben.
create or replace function public.demo_world_reset()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_world uuid;
begin
  select id into v_world from public.worlds where is_demo limit 1;
  if v_world is null then return; end if;

  -- Charaktere der Übenden: die Kaskade entfernt deren Beiträge, Kommentare, Reaktionen, Szenen und Nachrichten
  delete from public.characters where world_id = v_world and id::text not like 'de000000-%';
  delete from public.story_posts where world_id = v_world and id::text not like 'de000000-%';
  delete from public.story_entries e using public.story_posts s
    where e.story_post_id = s.id and s.world_id = v_world and e.id::text not like 'de000000-%';
  delete from public.posts p using public.characters c
    where p.character_id = c.id and c.world_id = v_world and p.id::text not like 'de000000-%';
  delete from public.comments cm using public.posts p, public.characters c
    where cm.post_id = p.id and p.character_id = c.id and c.world_id = v_world and cm.id::text not like 'de000000-%';
  delete from public.story_arcs where world_id = v_world and id::text not like 'de000000-%';
  delete from public.wiki_pages where world_id = v_world and id::text not like 'de000000-%';
  delete from public.wiki_maps where world_id = v_world and id::text not like 'de000000-%';
  delete from public.wiki_folders where world_id = v_world and id::text not like 'de000000-%';
  delete from public.character_relationships where world_id = v_world and id::text not like 'de000000-%';
  delete from public.scene_notes where world_id = v_world;
  delete from public.account_messages where chat_id in (select id from public.account_chats where world_id = v_world and kind in ('world', 'scene'));
  delete from public.trash_items where world_id = v_world;

  perform public.demo_world_refresh_dates();
end;
$$;
revoke execute on function public.demo_world_reset() from anon, authenticated, public;

-- Aufruf durch den Cron-Job (Vercel): mit dem gleichen Geheimnis wie digest_due.
create or replace function public.reset_demo_world(p_secret text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is distinct from (select value from public.app_secrets where key = 'cron') then
    raise exception 'Nicht erlaubt';
  end if;
  perform public.demo_world_reset();
end;
$$;
revoke execute on function public.reset_demo_world(text) from public;
grant execute on function public.reset_demo_world(text) to anon, authenticated;
