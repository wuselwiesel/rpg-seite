-- Beziehungsstatus je Charakter + optionale Verknüpfung zu Partner:in / beste:r Freund:in.
-- Grundlage für logisch stimmige Schicksale (z.B. "wird betrogen" zieht die echte Partnerin).

alter table public.characters add column if not exists relationship_status text;
alter table public.characters drop constraint if exists characters_relationship_status_check;
alter table public.characters add constraint characters_relationship_status_check
  check (relationship_status is null or relationship_status in ('single', 'beziehung', 'kompliziert', 'verheiratet'));

alter table public.characters add column if not exists partner_character_id uuid references public.characters (id) on delete set null;
alter table public.characters add column if not exists best_friend_character_id uuid references public.characters (id) on delete set null;
