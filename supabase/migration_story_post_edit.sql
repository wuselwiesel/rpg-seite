-- Szenen: als Erzähler:in beginnen, Szene bearbeiten und löschen (Autor:in)

alter table public.story_posts
  add column if not exists narrator boolean not null default false;

drop policy if exists "story_posts_delete_author" on public.story_posts;
create policy "story_posts_delete_author" on public.story_posts
  for delete to authenticated using (
    exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
    or exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
  );

notify pgrst, 'reload schema';
