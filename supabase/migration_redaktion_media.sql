-- Redaktion-Beiträge sollen dieselben Beitragsarten wie der normale Feed unterstützen (Text,
-- Foto/Video mit mehreren Fotos, Verlinkung einer Story) statt nur ein einzelnes Bild.
alter table public.redaktion_posts rename column image_url to media_url;

alter table public.redaktion_posts
  add column media_type text check (media_type in ('image', 'video')),
  add column media_urls text[],
  add column story_post_id uuid references public.story_posts (id) on delete set null;

notify pgrst, 'reload schema';
