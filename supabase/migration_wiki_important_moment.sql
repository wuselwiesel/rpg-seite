-- Migration: Ausschnitte („Wichtige Momente“) lassen sich im Wiki für alle in der Welt zeigen.
-- * neue mitgelieferte Seitenart „Wichtiger Moment“ (für bestehende Welten nachgetragen, für neue per Trigger)
-- * scene_clips.wiki_page_id: die Wiki-Seite, die aus dem Ausschnitt entstanden ist (feste Kopie des Wortlauts)

alter table public.scene_clips add column if not exists wiki_page_id uuid references public.wiki_pages (id) on delete set null;

create or replace function public.seed_wiki_types(p_world uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select created_by into v_owner from public.worlds where id = p_world;
  insert into public.wiki_types (world_id, id, label, plural, icon, color, hint, fields, outline, portrait, sort_order, created_by) values
    (p_world, 'ort', 'Ort', 'Orte', 'map-pin', 'sage', 'Städte, Landschaften, Gebäude',
      array['Art des Ortes','Lage','Einwohner','Herrschaft','Gegründet'], array['Beschreibung','Geschichte','Bewohner','Sehenswertes','Gerüchte'], false, 1, v_owner),
    (p_world, 'spezies', 'Spezies / Wesen', 'Spezies und Wesen', 'paw-print', 'peach', 'Völker, Rassen, Kreaturen',
      array['Art','Entstehung','Lebensdauer','Fähigkeiten','Schwäche'], array['Aussehen','Fähigkeiten und Schwächen','Lebensweise','Geschichte','Mythen und Irrtümer'], false, 2, v_owner),
    (p_world, 'organisation', 'Organisation / Haus', 'Organisationen und Häuser', 'users', 'plum', 'Fraktionen, Familien, Gruppen',
      array['Anführer:in','Sitz','Mitglieder','Gegründet','Ziele'], array['Überblick','Geschichte','Aufbau und Ränge','Mitglieder','Ziele und Gegner'], false, 3, v_owner),
    (p_world, 'person', 'Person', 'Personen', 'user', 'sky', 'Figuren der Welt, die keine Spielfigur sind',
      array['Alter','Beruf','Wohnort','Familie'], array['Wer ist die Person?','Lebensweg','Beziehungen','Geheimnisse'], true, 4, v_owner),
    (p_world, 'ereignis', 'Ereignis', 'Ereignisse', 'calendar-days', 'rose', 'Schlachten, Feste, Wendepunkte',
      array['Datum','Ort','Beteiligte','Folgen'], array['Was geschah?','Vorgeschichte','Ablauf','Folgen'], false, 5, v_owner),
    (p_world, 'mythos', 'Mythos', 'Mythen', 'scroll-text', 'gold', 'Legenden, Religionen, Bräuche',
      array['Herkunft','Verbreitung','Wahrheitsgehalt'], array['Die Erzählung','Ursprung','Deutungen','Was wirklich dahintersteckt'], false, 6, v_owner),
    (p_world, 'gegenstand', 'Gegenstand', 'Gegenstände', 'gem', 'slate', 'Waffen, Artefakte, Besonderes',
      array['Art','Besitzer:in','Herkunft','Wirkung'], array['Beschreibung','Geschichte','Kräfte und Preis','Aufenthaltsort'], false, 7, v_owner),
    (p_world, 'wichtiger_moment', 'Wichtiger Moment', 'Wichtige Momente', '🔖', 'gold', 'Ausschnitte aus Szenen für alle',
      array['Szene'], array[]::text[], false, 8, v_owner)
  on conflict (world_id, id) do nothing;
end;
$$;
revoke all on function public.seed_wiki_types(uuid) from public, anon, authenticated;

select public.seed_wiki_types(id) from public.worlds;

notify pgrst, 'reload schema';
