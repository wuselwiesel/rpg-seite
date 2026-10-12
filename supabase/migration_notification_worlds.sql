-- Benachrichtigungen kennen ihre Welt (aus dem Link abgeleitet) und lassen sich auf die aktuelle Welt beschränken.

alter table public.notifications
  add column if not exists world_id uuid references public.worlds (id) on delete cascade;

alter table public.notification_prefs
  add column if not exists only_active_world boolean not null default false;

-- Welt zu einem Link wie /story/<id>, /posts/<id>, /characters/<id>, /wiki/<id>, /worlds/<id>; sonst null (weltübergreifend).
create or replace function public.notification_link_world(p_link text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m text[];
  v_id uuid;
  v_world uuid;
begin
  m := regexp_match(coalesce(p_link, ''), '^/(story|posts|characters|wiki|worlds)/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
  if m is null then
    return null;
  end if;
  v_id := m[2]::uuid;
  if m[1] = 'story' then
    select world_id into v_world from public.story_posts where id = v_id;
  elsif m[1] = 'posts' then
    select c.world_id into v_world from public.posts p join public.characters c on c.id = p.character_id where p.id = v_id;
  elsif m[1] = 'characters' then
    select world_id into v_world from public.characters where id = v_id;
  elsif m[1] = 'wiki' then
    select world_id into v_world from public.wiki_pages where id = v_id;
  else
    select id into v_world from public.worlds where id = v_id;
  end if;
  return v_world;
end;
$$;

revoke all on function public.notification_link_world(text) from public, anon, authenticated;

create or replace function public.notifications_set_world()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.world_id is null then
    new.world_id := public.notification_link_world(new.link);
  end if;
  return new;
end;
$$;

revoke all on function public.notifications_set_world() from public, anon, authenticated;

drop trigger if exists notifications_set_world on public.notifications;
create trigger notifications_set_world
  before insert on public.notifications
  for each row execute function public.notifications_set_world();

update public.notifications set world_id = public.notification_link_world(link) where world_id is null;

create index if not exists notifications_user_world_idx on public.notifications (user_id, world_id, created_at desc);
