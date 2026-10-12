-- Welt verlassen (Besitz übertragen) und Konto löschen.
-- Gelöschte Konten hinterlassen keine Lücken in fremden Szenen: ihre Charaktere und Wiki-Seiten gehen an das Konto
-- „Gelöschter Account“ (Charaktere werden dabei als gelöscht markiert), alles Persönliche (Chats, Benachrichtigungen,
-- Freundschaften, Redaktion) wird mit dem Konto entfernt.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-0000000000ff', 'authenticated', 'authenticated', 'geloescht@wortwinkel.invalid',
        crypt(gen_random_uuid()::text, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;
insert into public.profiles (id, username, nickname) values ('de000000-0000-4000-8000-0000000000ff', 'geloeschter-account', 'Gelöschter Account')
on conflict (id) do update set nickname = 'Gelöschter Account';

-- Besitz einer Welt übertragen: nur die Besitzer:in, nur an ein Mitglied; die bisherige Besitzer:in wird Admin.
create or replace function public.worlds_keep_owner()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.created_by is distinct from old.created_by and coalesce(current_setting('app.transfer_world_owner', true), '') <> 'on' then
    raise exception 'Die Besitzer:in einer Welt lässt sich nicht ändern';
  end if;
  return new;
end;
$$;

create or replace function public.transfer_world_ownership(p_world uuid, p_new_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_old uuid;
begin
  select created_by into v_old from public.worlds where id = p_world;
  if v_old is null or v_old <> auth.uid() then
    raise exception 'Das darf nur die Besitzer:in der Welt.';
  end if;
  if p_new_owner = v_old then
    return;
  end if;
  if not exists (select 1 from public.world_members where world_id = p_world and user_id = p_new_owner) then
    raise exception 'Die neue Besitzer:in muss Mitglied der Welt sein.';
  end if;
  perform set_config('app.transfer_world_owner', 'on', true);
  update public.worlds set created_by = p_new_owner where id = p_world;
  perform set_config('app.transfer_world_owner', 'off', true);
  update public.world_members set role = 'admin' where world_id = p_world and user_id = v_old;
  update public.world_members set role = 'member' where world_id = p_world and user_id = p_new_owner;
end;
$$;
revoke execute on function public.transfer_world_ownership(uuid, uuid) from anon, public;
grant execute on function public.transfer_world_ownership(uuid, uuid) to authenticated;

-- Eigene Welten, in denen es noch andere Mitglieder oder deren Charaktere gibt (blockieren das Löschen des Kontos).
create or replace function public.account_deletion_blockers()
returns table (world_id uuid, name text, member_count bigint)
language sql stable security definer set search_path = public as $$
  select w.id, w.name, count(distinct u.uid)
  from public.worlds w
  join lateral (
    select m.user_id as uid from public.world_members m where m.world_id = w.id and m.user_id <> auth.uid()
    union
    select c.owner_id from public.characters c
      where c.world_id = w.id and c.owner_id <> auth.uid() and c.owner_id <> 'de000000-0000-4000-8000-0000000000ff'
  ) u on true
  where w.created_by = auth.uid()
  group by w.id, w.name
  order by w.name;
$$;
revoke execute on function public.account_deletion_blockers() from anon, public;
grant execute on function public.account_deletion_blockers() to authenticated;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
  v_tomb constant uuid := 'de000000-0000-4000-8000-0000000000ff';
begin
  if v_uid is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if v_uid in (v_tomb, 'de000000-0000-4000-8000-000000000001') then
    raise exception 'Dieses Konto kann nicht gelöscht werden.';
  end if;
  if exists (select 1 from public.account_deletion_blockers()) then
    raise exception 'Du besitzt noch Welten mit anderen Mitgliedern. Übertrage zuerst den Besitz.';
  end if;

  -- Welten, in denen niemand sonst Mitglied ist, verschwinden mit dem Konto
  delete from public.worlds where created_by = v_uid;

  -- Inhalte, die für andere sichtbar bleiben sollen, gehen an das Konto „Gelöschter Account“
  update public.characters set owner_id = v_tomb, deleted_at = coalesce(deleted_at, now()), username = null, partner_character_id = null
    where owner_id = v_uid;
  delete from public.wiki_pages where created_by = v_uid and is_draft;
  update public.wiki_pages set created_by = v_tomb where created_by = v_uid;
  update public.character_relationships set created_by = v_tomb where created_by = v_uid;
  update public.story_arcs set created_by = v_tomb where created_by = v_uid;
  update public.custom_emojis set created_by = v_tomb where created_by = v_uid;
  update public.badge_defs set created_by = v_tomb where created_by = v_uid;
  update public.world_custom_fates set created_by = v_tomb where created_by = v_uid;
  update public.world_random_entries set created_by = v_tomb where created_by = v_uid;
  update public.account_chats set created_by = v_tomb where created_by = v_uid and kind <> 'direct';
  update public.chats set created_by = v_tomb where created_by = v_uid;

  -- Alles Übrige (Profil, Mitgliedschaften, Chats, Benachrichtigungen, Redaktion, Freundschaften …) folgt per Kaskade
  delete from auth.users where id = v_uid;
end;
$$;
revoke execute on function public.delete_my_account() from anon, public;
grant execute on function public.delete_my_account() to authenticated;
