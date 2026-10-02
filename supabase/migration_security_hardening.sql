-- Sicherheits-Härtung (Oktober 2026)
-- 1) Interne Funktionen waren ohne Login aufrufbar (Supabase gibt neuen Funktionen standardmäßig EXECUTE an anon).
--    Jetzt nur noch angemeldet; ohne Login bleiben nur Registrierung (username_available), Login (get_email_for_username)
--    und der Cron-Aufruf (digest_due, mit Geheimnis) offen.
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.username_available(text, uuid) to anon;
grant execute on function public.digest_due(text) to anon;
grant execute on function public.get_email_for_username(text) to anon;

-- Künftige Funktionen sind ebenfalls nicht für anon freigegeben (bei Bedarf gezielt „grant execute … to anon“).
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema public grant execute on functions to authenticated;

-- 2) E-Mail zu Benutzername nur noch mit Server-Geheimnis (gleiches Geheimnis wie digest_due / CRON_SECRET).
--    Die alte Variante ohne Geheimnis liefert jeder Person die E-Mail-Adresse und wird danach entfernt:
--    drop function public.get_email_for_username(text);
create or replace function public.get_email_for_username(p_username text, p_secret text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if p_secret is distinct from (select value from public.app_secrets where key = 'cron') then
    raise exception 'Nicht erlaubt';
  end if;
  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(p_username)
  limit 1;
  return v_email;
end;
$$;

grant execute on function public.get_email_for_username(text, text) to anon, authenticated;

-- 3) Storage: Ändern/Löschen nur noch an eigenen Dateien (bisher durfte jede angemeldete Person fremde Dateien löschen).
alter policy "avatars_authenticated_update" on storage.objects
  using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);
alter policy "avatars_authenticated_delete" on storage.objects
  using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);
alter policy "post_images_authenticated_delete" on storage.objects
  using (bucket_id = 'post-images' and owner_id = (select auth.uid())::text);
alter policy "wiki_covers_authenticated_update" on storage.objects
  using (bucket_id = 'wiki-covers' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'wiki-covers' and owner_id = (select auth.uid())::text);
alter policy "wiki_covers_authenticated_delete" on storage.objects
  using (bucket_id = 'wiki-covers' and owner_id = (select auth.uid())::text);
alter policy "world_covers_authenticated_update" on storage.objects
  using (bucket_id = 'world-covers' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'world-covers' and owner_id = (select auth.uid())::text);
alter policy "world_covers_authenticated_delete" on storage.objects
  using (bucket_id = 'world-covers' and owner_id = (select auth.uid())::text);

notify pgrst, 'reload schema';
