-- Notizen zu einer Szene sind persönlich: jede:r sieht und ändert nur die eigene
alter table public.scene_notes add column if not exists user_id uuid references auth.users (id) on delete cascade;
update public.scene_notes set user_id = updated_by where user_id is null;
delete from public.scene_notes where user_id is null;
alter table public.scene_notes drop constraint if exists scene_notes_pkey;
alter table public.scene_notes alter column user_id set not null;
alter table public.scene_notes add primary key (story_post_id, user_id);

drop policy if exists scene_notes_select on public.scene_notes;
drop policy if exists scene_notes_insert on public.scene_notes;
drop policy if exists scene_notes_update on public.scene_notes;
drop policy if exists scene_notes_delete on public.scene_notes;

create policy scene_notes_select on public.scene_notes
  for select to authenticated using (user_id = (select auth.uid()));
create policy scene_notes_insert on public.scene_notes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.story_posts p where p.id = story_post_id));
create policy scene_notes_update on public.scene_notes
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy scene_notes_delete on public.scene_notes
  for delete to authenticated using (user_id = (select auth.uid()));

create index if not exists scene_notes_user_idx on public.scene_notes (user_id);

notify pgrst, 'reload schema';
