-- Migration: Würfelwürfe als spezielle Story-Einträge
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

alter table public.story_entries
  add column if not exists roll_label text,
  add column if not exists roll_value integer,
  add column if not exists roll_die integer,
  add column if not exists roll_result integer,
  add column if not exists roll_success boolean,
  add column if not exists roll_target_character_id uuid references public.characters (id) on delete set null;
