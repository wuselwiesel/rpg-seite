-- Reaktionen auf Chat-Nachrichten live im kleinen Chat-Fenster (Echtzeit respektiert die RLS).
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reactions') then
    alter publication supabase_realtime add table public.reactions;
  end if;
end $$;
