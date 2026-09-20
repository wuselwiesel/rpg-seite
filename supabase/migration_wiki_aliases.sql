-- Migration: Alternativnamen für Wiki-Einträge (für die automatische Verlinkung im Text)
alter table public.wiki_pages add column if not exists aliases text[] not null default '{}';
