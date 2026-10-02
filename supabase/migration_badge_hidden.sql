-- Badges pro Stück ausblenden: ausgeblendete Badges erscheinen nicht im Profil, in der Sammlung anderer und im Verlauf.
alter table public.badge_awards add column if not exists hidden boolean not null default false;

-- Besitzer:innen (Charakter bzw. Account) dürfen nur die Spalte "hidden" ändern.
revoke update on public.badge_awards from authenticated, anon;
grant update (hidden) on public.badge_awards to authenticated;

drop policy if exists "badge_awards_update_hidden" on public.badge_awards;
create policy "badge_awards_update_hidden" on public.badge_awards
  for update to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  )
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid())
  );

notify pgrst, 'reload schema';
