-- Eigene Badges von Account zu Account (Redaktion): Badge-Definitionen ohne Welt (world_id = null) gehören zum Account der Gestalterin.
-- Gestalten darf jede:r. Verleihen darf nur, wer das Badge gestaltet hat, und nur an Freund:innen. Sehen dürfen es alle Angemeldeten
-- (nur Name, Symbol, Farbe, Beschreibung); wer es bekommen hat, sieht man wie bei den anderen Abzeichen (eigene Sammlung bzw. Freund:innen).
alter table public.badge_defs alter column world_id drop not null;

alter policy "badge_defs_select_member" on public.badge_defs
  using (world_id is null or public.is_world_member(world_id));

alter policy "badge_defs_insert_member" on public.badge_defs
  with check (created_by = auth.uid() and (world_id is null or public.is_world_member(world_id)));

alter policy "badge_awards_insert" on public.badge_awards
  with check (
    (badge_key like 'auto:%' and character_id is not null and awarded_by is null and exists (
      select 1 from public.characters c where c.id = character_id and c.owner_id = auth.uid()
    ))
    or (badge_key like 'account:%' and user_id = auth.uid() and awarded_by is null)
    or (badge_key like 'custom:%' and character_id is not null and def_id is not null and awarded_by = auth.uid() and exists (
      select 1
      from public.badge_defs d
      join public.characters c on c.world_id = d.world_id
      where d.id = def_id and c.id = character_id
        and (d.created_by = auth.uid() or exists (select 1 from public.worlds w where w.id = d.world_id and w.created_by = auth.uid()))
    ))
    or (badge_key = 'custom:' || def_id::text and user_id is not null and user_id <> auth.uid() and def_id is not null and awarded_by = auth.uid()
      and public.is_friend_of(user_id)
      and exists (select 1 from public.badge_defs d where d.id = def_id and d.world_id is null and d.created_by = auth.uid()))
  );
