-- Migration: Welten selbst beitreten können (ohne Einladung)
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

drop policy if exists "world_members_insert" on public.world_members;
create policy "world_members_insert" on public.world_members
  for insert to authenticated with check (
    user_id = auth.uid()
    or (
      exists (select 1 from public.worlds w where w.id = world_id and w.created_by = auth.uid())
      and public.is_friend_of(user_id)
    )
  );
