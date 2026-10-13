-- Charakterbögen (ChaBo) für die Figuren der Übungswelt, damit der Reiter „ChaBo“ im Profil etwas zeigt.
-- Idempotent (on conflict); bleibt beim nächtlichen Zurücksetzen erhalten, weil die Figuren feste IDs 'de000000-…' haben.
with demo as (select id from public.worlds where is_demo limit 1),
v(name, titel, vorname, nachname, alter_, wesen, rang, race, fam_label, fam_value, story, sec_label, sec_value, sec_note_label, sec_note) as (values
  ('Vesper Nachtsang', 'Archivarin', 'Vesper', 'Nachtsang', '31', 'Mensch', 'Hüterin der Schattenbibliothek', 'none', 'Schwester', 'Ysolde Nachtsang',
    'Vesper ordnet Flüsterbände nach dem Klang, nicht nach dem Titel. Seit der Nacht der hundert Kerzen zählt sie mit.', 'Angst', 'Dass das Zählen nie aufhört', null, null),
  ('Dorian Blackwood', 'Gutsherr', 'Dorian', 'Blackwood', 'über 400', 'Mensch (zweifelhaft)', 'Herr von Gutshaus Blackwood', 'none', null, null,
    'Höflich, hungrig und nie zu früh. Wer sein Haus betritt, wird bewirtet. Wer bleibt, auch.', null, null, 'Der Hunger', 'Er trinkt nicht, weil er will, sondern weil der Hausgeist es verlangt.'),
  ('Seraphine Vael', 'Moorhexe', 'Seraphine', 'Vael', '212', 'Moorhexe', 'Älteste des Moors', 'none', null, null,
    'Seraphine kennt jeden Pfad durch den Nebel. Wer sie um Rat fragt, zahlt mit einer Erinnerung.', 'Wahrer Name', 'Seraphine Ashgrave', 'Das Geheimnis', 'Sie hat das Moor nie verlassen können – der Preis wurde damals mit ihrem Namen bezahlt.'),
  ('Morwenna Krähenhall', 'Schwester', 'Morwenna', 'Krähenhall', '29', 'Vampirin', 'Letzte Schwester von Sankt Veyr', 'vampir', null, null,
    'Sie trug das Kloster aus den Flammen, nicht die Menschen darin. Das Schweigen darüber ist ihr Gelübde.', null, null, 'Die Nacht von Sankt Veyr', 'Sie weiß, wer das Feuer gelegt hat.'),
  ('Iselin Moorfeld', 'Kräuterfrau', 'Iselin', 'Moorfeld', '47', 'Mensch', 'Hebamme von Schattenmoor', 'none', null, null,
    'Iselin weiß, welche Pflanze heilt und welche nur freundlich aussieht. Sie hat jedes Kind im Dorf auf die Welt geholt.', null, null, null, null),
  ('Tamsin Wermut', 'Nachtwächterin', 'Tamsin', 'Wermut', '36', 'Mensch', 'Trägerin der Laterne', 'none', null, null,
    'Tamsin zählt laut, wenn sie Angst hat. Bis hundert ist noch nie etwas passiert.', null, null, null, null),
  ('Pia Aschenbach', 'Sängerin', 'Pia', 'Aschenbach', '19', 'Mensch', 'Stimme der Marschen', 'none', null, null,
    'Sieht mit den Augen nichts, im Nebel alles. Ihr Lied auf dem Marktplatz hat noch nie jemand zu Ende gehört.', null, null, null, null),
  ('Elowen Lichtwehr', 'Kerzenmacherin', 'Elowen', 'Lichtwehr', '33', 'Mensch', 'Kerzenmacherin der Kapelle', 'none', null, null,
    'Elowen behauptet, die Flügel auf den Kerzen seien nur Verzierung. Die Kerzen brennen länger, als sie dürften.', null, null, null, null),
  ('Ysolde Nachtsang', 'Rückkehrerin', 'Ysolde', 'Nachtsang', '24', 'Mensch', 'Vespers Schwester', 'none', 'Schwester', 'Vesper Nachtsang',
    'Kam zurück, als niemand mehr mit ihr gerechnet hat. Sie spricht selten über die Jahre dazwischen.', null, null, null, null),
  ('Das Geschrei', null, 'Das', 'Geschrei', 'unbekannt', 'Nebelwesen', 'Was aus den Marschen kommt', 'none', null, null,
    'Es kommt, wenn der Nebel zu dicht wird. Wer es hört, hört es nie nur einmal.', null, null, null, null),
  ('Der Namenlose', null, 'Der', 'Namenlose', 'unbekannt', 'Erscheinung', 'Niemand erinnert sich an sein Gesicht', 'none', null, null,
    'Man erinnert sich nur an das Kratzen im Holz. Wer seinen Namen sagt, hat ihn gleich wieder vergessen.', null, null, null, null),
  ('Der Schattenschreiber', null, 'Der', 'Schattenschreiber', 'unbekannt', 'Schattenwesen', 'Zeichnet, was nicht gesehen werden soll', 'none', null, null,
    'Zeichnet, was nicht gesehen werden soll, und wird dabei selbst dünner.', null, null, null, null),
  ('Die Heilige der Asche', null, 'Die', 'Heilige der Asche', 'unbekannt', 'Erscheinung', 'Ein Gesicht über der Kapelle', 'none', null, null,
    'Ein Gesicht aus Sternenstaub. Wer ihre Zeichen deutet, bekommt eine Antwort, aber selten die auf die gestellte Frage.', null, null, null, null),
  ('Die Moorwächterin', null, 'Die', 'Moorwächterin', 'unbekannt', 'Hüterin', 'Sitzt auf dem Findling am Moorrand', 'none', null, null,
    'Sitzt auf dem Findling am Moorrand und hütet die Kerzen. Fragt nie zweimal.', null, null, null, null)
),
base as (
  select c.id, v.*,
    (select jsonb_object_agg(a.code, (4 + abs(hashtext(c.id::text || a.code)) % 7)::text)
       from (values ('MU'), ('IG'), ('GE'), ('KO'), ('IN'), ('KK'), ('FF'), ('CH'), ('SB')) a(code)) || jsonb_build_object('GL', '8') as attr
  from public.characters c
  join v on v.name = c.name
  where c.world_id = (select id from demo) and c.id::text like 'de000000-%'
),
ins as (
  insert into public.character_sheets (character_id, data)
  select id, jsonb_build_object(
    'race', race,
    'luckPointsUsed', 0,
    'personalFields', jsonb_build_array(
      jsonb_build_object('label', 'Titel', 'value', coalesce(titel, '')),
      jsonb_build_object('label', 'Vorname', 'value', vorname),
      jsonb_build_object('label', 'Nachname', 'value', nachname),
      jsonb_build_object('label', 'Alter', 'value', alter_),
      jsonb_build_object('label', 'Wesen', 'value', wesen),
      jsonb_build_object('label', 'Rang', 'value', rang)),
    'family', case when fam_label is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('label', fam_label, 'value', fam_value)) end,
    'familyTitle', 'Familie',
    'attrBasis', attr,
    'attrBonus', '{}'::jsonb,
    'talentBasis', '{}'::jsonb,
    'talentBonus', '{}'::jsonb,
    'notesBlocks', jsonb_build_array(jsonb_build_object('label', 'Geschichte', 'html', '<p>' || story || '</p>')))
  from base
  on conflict (character_id) do update set data = excluded.data, updated_at = now()
  returning character_id
)
insert into public.character_sheet_secrets (character_id, data)
select id, jsonb_build_object(
  'personalFields', case when sec_label is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('label', sec_label, 'value', sec_value, 'pos', 3)) end,
  'family', '[]'::jsonb,
  'notesBlocks', case when sec_note_label is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('label', sec_note_label, 'html', '<p>' || sec_note || '</p>', 'pos', 1)) end)
from base
where sec_label is not null or sec_note_label is not null
on conflict (character_id) do update set data = excluded.data, updated_at = now();

-- Würfeln in der Übungswelt einschalten, sonst bleiben Attribute und Talente im ChaBo verborgen
update public.worlds set dice_enabled = true where is_demo;
