-- Migration: Charakterbogen-Verknüpfung
-- Auf dem bestehenden Live-Projekt im Supabase SQL Editor ausführen.

alter table public.characters add column if not exists sheet_url text;
