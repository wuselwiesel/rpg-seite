-- Eigene Chat-Farben: Hauptfarbe, Akzent und Hintergrund pro Person und Chat (Rollenspiel- und Redaktions-Chats).
create table if not exists public.chat_themes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chat_kind text not null check (chat_kind in ('account', 'rp')),
  chat_id uuid not null,
  main text,
  accent text,
  bg text,
  updated_at timestamptz not null default now(),
  primary key (user_id, chat_kind, chat_id),
  constraint chat_themes_hex check (
    (main is null or main ~ '^#[0-9a-fA-F]{6}$')
    and (accent is null or accent ~ '^#[0-9a-fA-F]{6}$')
    and (bg is null or bg ~ '^#[0-9a-fA-F]{6}$')
  )
);

alter table public.chat_themes enable row level security;

drop policy if exists "chat_themes_own" on public.chat_themes;
create policy "chat_themes_own" on public.chat_themes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
