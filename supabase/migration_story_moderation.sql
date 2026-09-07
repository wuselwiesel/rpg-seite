-- Moderationswerkzeuge für Welt-Owner: Szenen anpinnen, sperren (keine neuen
-- Fortsetzungen mehr) oder archivieren.

alter table public.story_posts add column pinned boolean not null default false;
alter table public.story_posts add column locked boolean not null default false;
alter table public.story_posts add column archived boolean not null default false;

create policy "story_posts_update_world_owner" on public.story_posts
  for update to authenticated using (
    exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

drop policy "story_entries_insert_member" on public.story_entries;
create policy "story_entries_insert_member" on public.story_entries
  for insert to authenticated with check (
    exists (
      select 1 from public.story_posts sp
      join public.characters c on c.id = character_id
      where sp.id = story_post_id
        and c.owner_id = auth.uid()
        and c.world_id = sp.world_id
        and not sp.locked
        and (not sp.is_private or public.can_view_private_story_post(sp.id, sp.character_id))
    )
  );
