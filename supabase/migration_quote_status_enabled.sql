-- „Zitat“ und „Status-Zeile“ bei Charakteren je Welt ausschaltbar (Standard: an): kein Feld im Formular, nicht im Profil.
alter table public.worlds add column if not exists quote_enabled boolean not null default true, add column if not exists status_enabled boolean not null default true;

notify pgrst, 'reload schema';
