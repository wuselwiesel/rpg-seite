-- Talente je Welt anpassbar: Liste aus { name, attrs: [Attribut, Attribut] }; leer = Standardliste (lib/talents.ts)
alter table public.worlds add column if not exists talent_config jsonb;
