-- Migration: Eigene Emojis gelten weltübergreifend.
-- * Ein Emoji gehört dem Konto, das es hochgeladen hat, und ist in allen Welten (und Chats) für alle Konten sichtbar und nutzbar.
-- * Namen sind jetzt insgesamt eindeutig (vorher je Welt). world_id bleibt nur als Herkunft (alte Emojis) und ist optional.
-- * Löschen einer Welt löscht ihre Emojis nicht mehr.

alter table public.custom_emojis alter column world_id drop not null;
alter table public.custom_emojis drop constraint if exists custom_emojis_world_id_fkey;
alter table public.custom_emojis add constraint custom_emojis_world_id_fkey foreign key (world_id) references public.worlds (id) on delete set null;

drop index if exists public.custom_emojis_world_name_idx;
create unique index if not exists custom_emojis_name_idx on public.custom_emojis (name);

drop policy if exists "custom_emojis_select_member" on public.custom_emojis;
drop policy if exists "custom_emojis_select_all" on public.custom_emojis;
create policy "custom_emojis_select_all" on public.custom_emojis
  for select to authenticated using (true);

drop policy if exists "custom_emojis_insert_member" on public.custom_emojis;
drop policy if exists "custom_emojis_insert_own" on public.custom_emojis;
create policy "custom_emojis_insert_own" on public.custom_emojis
  for insert to authenticated with check (created_by = auth.uid());

notify pgrst, 'reload schema';
