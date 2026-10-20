-- Durchsicht 20. Oktober 2026 (Supabase-Berater): feste Suchpfade, keine Aufruf-Rechte für Trigger-Funktionen, schnellere Richtlinien, Indizes für Fremdschlüssel.
alter function public.characters_set_created_by() set search_path = public;
alter function public._role_is_available(public.world_roles) set search_path = public;
alter function public._ticket_images_ok(text[]) set search_path = public;
do $$ declare f regprocedure; begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='normalize_signup_code' loop
    execute format('alter function %s set search_path = public', f);
  end loop;
end $$;
-- Trigger-Funktionen müssen nicht über die Schnittstelle aufrufbar sein
revoke all on function public._role_release_on_delete() from public, anon, authenticated;
revoke all on function public.announce_world_join() from public, anon, authenticated;
revoke all on function public.characters_review_guard() from public, anon, authenticated;
revoke all on function public.characters_review_insert() from public, anon, authenticated;
revoke all on function public.characters_set_created_by() from public, anon, authenticated;

-- auth.uid() einmal je Abfrage statt je Zeile (alter policy statt drop)
alter policy custom_emojis_insert_own_scoped on public.custom_emojis with check ((created_by = (select auth.uid())) and ((not world_only) or is_world_member(world_id)));
alter policy redaktion_posts_delete_own on public.redaktion_posts using ((author_id = (select auth.uid())) or (is_app_admin() and has_account_mark(author_id, 'official'::text)));
alter policy redaktion_posts_insert_own on public.redaktion_posts with check ((author_id = (select auth.uid())) or (is_app_admin() and has_account_mark(author_id, 'official'::text)));
alter policy redaktion_posts_update_own on public.redaktion_posts using ((author_id = (select auth.uid())) or (is_app_admin() and has_account_mark(author_id, 'official'::text)));
alter policy friendships_delete_own on public.friendships using ((((select auth.uid()) = requester_id) or ((select auth.uid()) = addressee_id)) and (not has_account_mark(requester_id, 'official'::text)) and (not has_account_mark(addressee_id, 'official'::text)));
alter policy account_chats_delete on public.account_chats using (is_account_chat_member(id) and (kind = any (array['direct'::text, 'group'::text])) and ((kind = 'direct'::text) or (created_by = (select auth.uid()))));
alter policy character_sheet_log_insert_world_owner_npc on public.character_sheet_log with check ((actor_id = (select auth.uid())) and exists (select 1 from characters c where c.id = character_sheet_log.character_id and (c.is_npc or c.vacant) and is_world_admin(c.world_id)));
alter policy ticket_comments_select on public.ticket_comments using (is_app_admin() or ((not internal) and exists (select 1 from tickets t where t.id = ticket_comments.ticket_id and t.created_by = (select auth.uid()))));
alter policy ticket_reads_select on public.ticket_reads using (user_id = (select auth.uid()));
alter policy tickets_select on public.tickets using ((created_by = (select auth.uid())) or is_app_admin());

-- Indizes für Fremdschlüssel (schnelleres Löschen von Konten und Welten, schnellere Abfragen)
create index if not exists character_change_proposals_proposed_by_idx on public.character_change_proposals (proposed_by);
create index if not exists character_claims_created_by_idx on public.character_claims (created_by);
create index if not exists character_claims_decided_by_idx on public.character_claims (decided_by);
create index if not exists character_transfers_by_user_idx on public.character_transfers (by_user);
create index if not exists character_transfers_from_user_idx on public.character_transfers (from_user);
create index if not exists character_transfers_to_user_idx on public.character_transfers (to_user);
create index if not exists character_transfers_world_idx on public.character_transfers (world_id);
create index if not exists characters_reviewed_by_idx on public.characters (reviewed_by) where reviewed_by is not null;
create index if not exists notifications_world_idx on public.notifications (world_id) where world_id is not null;
create index if not exists scene_notes_updated_by_idx on public.scene_notes (updated_by);
create index if not exists signup_codes_created_by_idx on public.signup_codes (created_by);
create index if not exists ticket_comments_author_idx on public.ticket_comments (author_id);
create index if not exists ticket_reads_user_idx on public.ticket_reads (user_id);
create index if not exists tickets_last_actor_idx on public.tickets (last_actor);
create index if not exists tickets_merged_into_idx on public.tickets (merged_into) where merged_into is not null;
create index if not exists welcome_announcements_world_idx on public.welcome_announcements (world_id);
create index if not exists welcome_greetings_from_user_idx on public.welcome_greetings (from_user);
create index if not exists world_admin_notify_prefs_user_idx on public.world_admin_notify_prefs (user_id);
create index if not exists world_invites_created_by_idx on public.world_invites (created_by);
create index if not exists world_join_requests_character_idx on public.world_join_requests (character_id);
create index if not exists world_join_requests_decided_by_idx on public.world_join_requests (decided_by);
create index if not exists world_role_requests_decided_by_idx on public.world_role_requests (decided_by);
create index if not exists world_role_requests_user_idx on public.world_role_requests (user_id);
create index if not exists world_roles_created_by_idx on public.world_roles (created_by);
create index if not exists world_roles_holder_user_idx on public.world_roles (holder_user) where holder_user is not null;

notify pgrst, 'reload schema';
