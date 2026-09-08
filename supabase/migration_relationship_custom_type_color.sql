-- Beziehungsnetz: statt eines festen Enums (verbuendet/verfeindet/liiert/...)
-- kann jetzt jede Bezeichnung frei eingegeben werden, plus eine frei
-- gewählte Farbe fürs Netz-Diagramm.

alter table public.character_relationships drop constraint character_relationships_type_check;
alter table public.character_relationships add column color text not null default '#9a9a9a';
alter table public.character_relationships alter column type set default 'Verbunden';
