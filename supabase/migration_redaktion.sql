-- "Redaktion": Out-of-Character-Bereich für Account-Posts, Diskussionen und Umfragen
-- (Autor:in ist der Login-Account selbst, nicht ein Charakter) - welt-unabhängig,
-- sichtbar für die Autor:in und ihre akzeptierten Freund:innen (wie posts_select_own_or_friends,
-- aber auf Profil- statt Charakter-Ebene).

create table public.redaktion_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  image_url text,
  tags text[] not null default '{}',
  -- Umfrage-Konfiguration; poll_options.count() = 0 bedeutet "keine Umfrage, nur Diskussion".
  poll_multi_select boolean not null default false,
  poll_show_voters boolean not null default false,
  poll_character_mode boolean not null default false,
  poll_closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index redaktion_posts_author_idx on public.redaktion_posts (author_id);

alter table public.redaktion_posts enable row level security;

create policy "redaktion_posts_select_own_or_friends" on public.redaktion_posts
  for select to authenticated using (author_id = auth.uid() or public.is_friend_of(author_id));

create policy "redaktion_posts_insert_own" on public.redaktion_posts
  for insert to authenticated with check (author_id = auth.uid());

create policy "redaktion_posts_update_own" on public.redaktion_posts
  for update to authenticated using (author_id = auth.uid());

create policy "redaktion_posts_delete_own" on public.redaktion_posts
  for delete to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------------------

create table public.redaktion_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redaktion_posts (id) on delete cascade,
  label text not null,
  -- Bei Charakter-Umfragen (poll_character_mode) zeigt das auf den gewählten Charakter,
  -- statt den Namen als freien Text zu speichern - bleibt so aktuell, falls er umbenannt wird.
  character_id uuid references public.characters (id) on delete cascade,
  position int not null default 0
);

create index redaktion_poll_options_post_idx on public.redaktion_poll_options (post_id);

alter table public.redaktion_poll_options enable row level security;

create policy "redaktion_poll_options_select_if_post_visible" on public.redaktion_poll_options
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_poll_options_manage_own_post" on public.redaktion_poll_options
  for all to authenticated using (
    exists (select 1 from public.redaktion_posts p where p.id = post_id and p.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.redaktion_posts p where p.id = post_id and p.author_id = auth.uid())
  );

-- ---------------------------------------------------------------------------

create table public.redaktion_poll_votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.redaktion_poll_options (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (option_id, voter_id)
);

create index redaktion_poll_votes_option_idx on public.redaktion_poll_votes (option_id);
create index redaktion_poll_votes_voter_idx on public.redaktion_poll_votes (voter_id);

alter table public.redaktion_poll_votes enable row level security;

create policy "redaktion_poll_votes_select_if_post_visible" on public.redaktion_poll_votes
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_poll_options o
      join public.redaktion_posts p on p.id = o.post_id
      where o.id = option_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_poll_votes_insert_own" on public.redaktion_poll_votes
  for insert to authenticated with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.redaktion_poll_options o
      join public.redaktion_posts p on p.id = o.post_id
      where o.id = option_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_poll_votes_delete_own" on public.redaktion_poll_votes
  for delete to authenticated using (voter_id = auth.uid());

-- ---------------------------------------------------------------------------

create table public.redaktion_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.redaktion_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  parent_id uuid references public.redaktion_comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index redaktion_comments_post_idx on public.redaktion_comments (post_id);

alter table public.redaktion_comments enable row level security;

create policy "redaktion_comments_select_if_post_visible" on public.redaktion_comments
  for select to authenticated using (
    exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_comments_insert_if_post_visible" on public.redaktion_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.redaktion_posts p
      where p.id = post_id and (p.author_id = auth.uid() or public.is_friend_of(p.author_id))
    )
  );

create policy "redaktion_comments_update_own" on public.redaktion_comments
  for update to authenticated using (author_id = auth.uid());

create policy "redaktion_comments_delete_own" on public.redaktion_comments
  for delete to authenticated using (author_id = auth.uid());
