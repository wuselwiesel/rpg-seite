-- Likes und Emoji-Reaktionen auf Redaktions-Beiträge (pro Account, nicht pro Charakter).
create table if not exists public.redaktion_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redaktion_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);

create index if not exists redaktion_reactions_post_idx on public.redaktion_reactions (post_id);

alter table public.redaktion_reactions enable row level security;

drop policy if exists "redaktion_reactions_select_if_post_visible" on public.redaktion_reactions;
create policy "redaktion_reactions_select_if_post_visible" on public.redaktion_reactions
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

drop policy if exists "redaktion_reactions_insert_own" on public.redaktion_reactions;
create policy "redaktion_reactions_insert_own" on public.redaktion_reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

drop policy if exists "redaktion_reactions_delete_own" on public.redaktion_reactions;
create policy "redaktion_reactions_delete_own" on public.redaktion_reactions
  for delete to authenticated using (user_id = auth.uid());

notify pgrst, 'reload schema';
