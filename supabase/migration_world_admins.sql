-- Welt-Admins: Die Besitzer:in kann Mitglieder zu Admins ernennen. Admins dürfen die Welt bearbeiten (Name, Bild, Beschreibung), Freund:innen einladen,
-- normale Mitglieder entfernen und Szenen moderieren (anpinnen, abschließen, archivieren). Löschen der Welt, Admins ernennen/entziehen und
-- das Entfernen anderer Admins bleibt bei der Besitzer:in.
alter table public.world_members add column if not exists role text not null default 'member';
alter table public.world_members add constraint world_members_role_check check (role in ('member', 'admin'));

create or replace function public.is_world_admin(_world_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.worlds w where w.id = _world_id and w.created_by = auth.uid())
      or exists (select 1 from public.world_members wm where wm.world_id = _world_id and wm.user_id = auth.uid() and wm.role = 'admin');
$$;

revoke all on function public.is_world_admin(uuid) from public, anon;
grant execute on function public.is_world_admin(uuid) to authenticated;

-- Die Besitzer:in einer Welt darf nicht wechseln (sonst könnte eine Admin sich zur Besitzer:in machen)
create or replace function public.worlds_keep_owner()
returns trigger
language plpgsql
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Die Besitzer:in einer Welt lässt sich nicht ändern';
  end if;
  return new;
end;
$$;

create trigger worlds_keep_owner_trg before update on public.worlds for each row execute function public.worlds_keep_owner();

alter policy "worlds_update_own" on public.worlds using (public.is_world_admin(id));

alter policy "world_members_insert" on public.world_members with check (
  role = 'member' and (
  user_id = auth.uid()
  or (public.is_world_admin(world_id) and public.is_friend_of(user_id))
  )
);

alter policy "world_members_delete_own" on public.world_members using (
  user_id = auth.uid()
  or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  or (
    public.is_world_admin(world_id)
    and role = 'member'
    and not exists (select 1 from public.worlds w where w.id = world_id and w.created_by = world_members.user_id)
  )
);

-- Nur die Besitzer:in ändert Rollen (Mitglied ↔ Admin); niemand ändert die eigene Rolle über andere Wege
create policy "world_members_update_role" on public.world_members
  for update to authenticated
  using (exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid()))
  with check (exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid()));

alter policy "story_posts_update_world_owner" on public.story_posts using (public.is_world_admin(world_id));

notify pgrst, 'reload schema';
