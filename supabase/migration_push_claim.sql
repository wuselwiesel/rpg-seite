-- Push-Abos gehören immer dem aktuell angemeldeten Konto: ein Gerät, das zuvor zu einem anderen
-- Konto gehörte, wird beim Anmelden übernommen (statt weiter dessen Benachrichtigungen zu erhalten).

create or replace function public.claim_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = auth.uid(), p256dh = excluded.p256dh, auth = excluded.auth;
end;
$$;

grant execute on function public.claim_push_subscription(text, text, text) to authenticated;

notify pgrst, 'reload schema';
