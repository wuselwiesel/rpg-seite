-- Migration: Chat nur für eine Szene (außerhalb des Spiels, zwischen den Accounts)
-- Neue Art kind = 'scene' bei account_chats. Der Chat gehört zu genau einer Szene (story_post_id) und taucht nicht in der
-- Chatliste oder der Chat-Blase auf, sondern nur in der Szene selbst (Reiter „Chat“ neben Schreiben und Würfeln).
-- Mitglieder: wer die Szene geschrieben hat oder mitschreibt, plus alle, die den Reiter öffnen (und die Szene sehen dürfen).

alter table public.account_chats add column if not exists story_post_id uuid references public.story_posts (id) on delete cascade;

alter table public.account_chats drop constraint if exists account_chats_kind_check;
alter table public.account_chats add constraint account_chats_kind_check check (kind in ('direct', 'group', 'world', 'scene'));
alter table public.account_chats drop constraint if exists account_chats_scene_shape;
alter table public.account_chats add constraint account_chats_scene_shape check ((kind = 'scene') = (story_post_id is not null));

create unique index if not exists account_chats_scene_uidx on public.account_chats (story_post_id) where kind = 'scene';

-- Öffnet den Chat der Szene (legt ihn bei Bedarf an) und trägt die aufrufende Person ein.
-- Erlaubt: wer in der Welt mitspielt (mindestens ein nicht gelöschter Charakter) oder Admin ist; bei geheimen Szenen nur, wer sie sehen darf.
create or replace function public.open_scene_chat(p_story_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_world uuid;
  v_private boolean;
  v_chat uuid;
begin
  if v_me is null then
    raise exception 'Nicht angemeldet.';
  end if;
  select world_id, is_private into v_world, v_private from public.story_posts where id = p_story_post_id;
  if v_world is null then
    raise exception 'Szene nicht gefunden.';
  end if;
  if not (
    exists (select 1 from public.characters c where c.owner_id = v_me and c.world_id = v_world and c.deleted_at is null)
    or public.is_world_admin(v_world)
  ) then
    raise exception 'Keine Berechtigung';
  end if;
  if v_private and not (
    exists (select 1 from public.story_posts p join public.characters c on c.id = p.character_id where p.id = p_story_post_id and c.owner_id = v_me)
    or exists (select 1 from public.story_post_viewers v join public.characters c on c.id = v.character_id where v.story_post_id = p_story_post_id and c.owner_id = v_me)
    or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = v_me)
  ) then
    raise exception 'Keine Berechtigung';
  end if;

  select id into v_chat from public.account_chats where kind = 'scene' and story_post_id = p_story_post_id;
  if v_chat is null then
    insert into public.account_chats (created_by, kind, story_post_id)
    values (v_me, 'scene', p_story_post_id)
    on conflict (story_post_id) where kind = 'scene' do nothing
    returning id into v_chat;
    if v_chat is null then
      select id into v_chat from public.account_chats where kind = 'scene' and story_post_id = p_story_post_id;
    else
      -- Beim Anlegen: alle, die in der Szene schon mitgeschrieben haben (und die Autor:in), kommen gleich mit hinein
      insert into public.account_chat_participants (chat_id, user_id)
      select v_chat, u.owner_id
      from (
        select c.owner_id from public.story_posts p join public.characters c on c.id = p.character_id where p.id = p_story_post_id
        union
        select c.owner_id from public.story_entries e join public.characters c on c.id = e.character_id where e.story_post_id = p_story_post_id
      ) u
      where (not v_private) or u.owner_id = v_me
        or exists (select 1 from public.story_post_viewers v join public.characters c2 on c2.id = v.character_id where v.story_post_id = p_story_post_id and c2.owner_id = u.owner_id)
        or exists (select 1 from public.worlds w where w.id = v_world and w.created_by = u.owner_id)
        or exists (select 1 from public.story_posts p2 join public.characters c3 on c3.id = p2.character_id where p2.id = p_story_post_id and c3.owner_id = u.owner_id)
      on conflict do nothing;
    end if;
  end if;

  insert into public.account_chat_participants (chat_id, user_id) values (v_chat, v_me) on conflict do nothing;
  return v_chat;
end;
$$;

revoke all on function public.open_scene_chat(uuid) from public, anon;
grant execute on function public.open_scene_chat(uuid) to authenticated;

notify pgrst, 'reload schema';
