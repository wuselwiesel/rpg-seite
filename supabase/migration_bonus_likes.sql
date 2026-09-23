-- Zusätzliche, nicht echte Likes je Beitrag (manuell von der Besitzerin/dem Besitzer gesetzt) –
-- kommt bei der Anzeige oben auf die echten Reaktionen drauf.
alter table public.posts add column if not exists bonus_likes integer not null default 0;
alter table public.posts add constraint posts_bonus_likes_range check (bonus_likes >= 0 and bonus_likes <= 1000000);
