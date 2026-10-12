-- Übungswelt „Windlichthafen“: Beispielinhalte (Teil von migration_demo_world.sql). Feste IDs de000000-… markieren Beispielinhalt;
-- alles andere in der Welt wird nachts von demo_world_reset() entfernt.

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'uebungswelt@wortwinkel.invalid',
        crypt(gen_random_uuid()::text, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
on conflict (id) do nothing;
insert into public.profiles (id, username, nickname) values ('de000000-0000-4000-8000-000000000001', 'wortwinkel', 'Wortwinkel') on conflict (id) do nothing;

insert into public.worlds (id, name, description, created_by, cover_image_url, welcome_html, is_public, is_demo, join_mode, preview, dice_enabled, permissions)
values ('de000000-0000-4000-8000-000000000002', 'Übungswelt', 'Der Windlichthafen: ein kleiner Hafen voller Laternen, Gerüchte und Teekannen. Zum Ausprobieren.',
        'de000000-0000-4000-8000-000000000001', 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-banner7.jpg', '<p><strong>Willkommen im Windlichthafen!</strong> Das hier ist eine Übungswelt: Schreib, würfle und baue Wiki-Seiten, so viel du magst. Was du anlegst, wird nachts aufgeräumt – die Hafenbewohner bleiben.</p><ul><li>Lege einen Charakter an – ein Name genügt.</li><li>Antworte in der Szene „Willkommen im Windlichthafen“.</li><li>Stöbere im Wiki und lege eine eigene Seite an.</li></ul>', true, true, 'open', 'full', true,
        '{"wiki_create":"all","wiki_edit":"own","wiki_structure":"admins","story_create":"all","arc_create":"all"}'::jsonb)
on conflict (id) do nothing;
insert into public.world_members (world_id, user_id, role) values ('de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-000000000001', 'member') on conflict do nothing;
insert into public.world_members (world_id, user_id, role) values ('de000000-0000-4000-8000-000000000002', '713789b3-1e9e-4bca-84dc-0b0417a349bb', 'admin') on conflict do nothing;

insert into public.characters (id, owner_id, name, avatar_url, bio, world_id, species, gender, status_text, quote, is_npc)
values ('de000000-0000-4000-8000-010000000001', 'de000000-0000-4000-8000-000000000001', 'Mathilda Brandt', 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/avatars/testdata/schattenmoor-av20.jpg', 'Hafenmeisterin des Windlichthafens. Führt das Logbuch, die Laternenliste und notfalls eine Rettungsmannschaft an. Lacht laut und vergisst nie ein Gesicht.', 'de000000-0000-4000-8000-000000000002', 'mensch', 'weiblich', 'Auf der Mole', 'Wer im Nebel ankommt, bekommt zuerst einen Tee.', false)
on conflict (id) do nothing;

insert into public.characters (id, owner_id, name, avatar_url, bio, world_id, species, gender, status_text, quote, is_npc)
values ('de000000-0000-4000-8000-010000000002', 'de000000-0000-4000-8000-000000000001', 'Finn Lattenzaun', 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/avatars/testdata/schattenmoor-av13.jpg', 'Zündet jeden Abend die Laternen an der Nordmole an. Kennt jede Treppe, jede Katze und jedes Schlupfloch im Hafen.', 'de000000-0000-4000-8000-000000000002', 'mensch', 'maennlich', 'Unterwegs mit der Leiter', 'Eine Laterne leuchtet nur, wenn jemand sie vermisst hätte.', false)
on conflict (id) do nothing;

insert into public.characters (id, owner_id, name, avatar_url, bio, world_id, species, gender, status_text, quote, is_npc)
values ('de000000-0000-4000-8000-010000000003', 'de000000-0000-4000-8000-000000000001', 'Rosalind Tauwerk', 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/avatars/testdata/schattenmoor-av15.jpg', 'Wirtin der Teestube „Zum Löffelchen“. Backt nach Gefühl, hört alles und erzählt nur die Hälfte weiter.', 'de000000-0000-4000-8000-000000000002', 'mensch', 'weiblich', 'Der Kuchen ist gleich fertig', 'Setz dich. Das Reden kommt vom Tee.', false)
on conflict (id) do nothing;

insert into public.characters (id, owner_id, name, avatar_url, bio, world_id, species, gender, status_text, quote, is_npc)
values ('de000000-0000-4000-8000-010000000004', 'de000000-0000-4000-8000-000000000001', 'Jorin Kesselbach', '/demo/vampir.jpg', 'Erfinder. Seine Maschinen sind laut, seine Absichten gut. Das Nebelhorn auf dem Dach der Werkstatt ist seine Erfindung.', 'de000000-0000-4000-8000-000000000002', 'mensch', 'maennlich', 'In der Werkstatt', 'Es ist nicht kaputt. Es ist nur noch nicht fertig.', false)
on conflict (id) do nothing;

insert into public.characters (id, owner_id, name, avatar_url, bio, world_id, species, gender, status_text, quote, is_npc)
values ('de000000-0000-4000-8000-010000000005', 'de000000-0000-4000-8000-000000000001', 'Selma Nebelhorn', 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/avatars/testdata/schattenmoor-av18.jpg', 'Postbotin auf einem flachen Boot. Liefert Briefe, Pakete und gelegentlich Neuigkeiten, die niemand bestellt hat.', 'de000000-0000-4000-8000-000000000002', 'mensch', 'weiblich', 'Mit dem Postboot unterwegs', 'Ich bringe nur, was angekommen ist.', false)
on conflict (id) do nothing;

insert into public.characters (id, owner_id, name, avatar_url, bio, world_id, species, gender, status_text, quote, is_npc)
values ('de000000-0000-4000-8000-010000000006', 'de000000-0000-4000-8000-000000000001', 'Ilvy Möwenstein', 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/avatars/testdata/schattenmoor-av16.jpg', 'Kartenzeichnerin. Ihre Karten stimmen – manchmal erst am nächsten Tag.', 'de000000-0000-4000-8000-000000000002', 'mensch', 'weiblich', 'Zeichnet die Bucht neu', 'Die Küste war gestern anders.', false)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000007', 'de000000-0000-4000-8000-010000000001', '', '<p>Hinweis für alle Neuen: Im Windlichthafen darf man alles ausprobieren. Stellt euch vor, schreibt in der Szene „Willkommen im Windlichthafen“ und seht euch im Wiki um.</p>', ARRAY['willkommen']::text[], null, null, true, 14)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000001', 'de000000-0000-4000-8000-010000000001', '', '<p>Neue Boje vor der Nordmole. Wer sie anrempelt, zahlt eine Runde Tee.</p>', ARRAY['hafen','nordmole']::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-full9.jpg', 'image', false, 9)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000002', 'de000000-0000-4000-8000-010000000003', '', '<p>Heute gibt es Brombeer-Zimt-Kuchen. Nur solange der Vorrat reicht – und der Vorrat reicht nie.</p>', ARRAY['teestube','kuchen']::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-full15.jpg', 'image', false, 12)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000003', 'de000000-0000-4000-8000-010000000002', '', '<p>Vierzehn Laternen angezündet, eine davon zweimal. Ich glaube, sie leuchtet einfach lieber.</p>', ARRAY['laternen']::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-full8.jpg', 'image', false, 7)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000004', 'de000000-0000-4000-8000-010000000004', '', '<p>Das Nebelhorn hat gestern zum ersten Mal einen Ton getroffen. Es war ein A. Die Möwen sind beleidigt.</p>', ARRAY['erfindungen']::text[], '/demo/schattenwesen.jpg', 'image', false, 11)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000005', 'de000000-0000-4000-8000-010000000005', '', '<p>Ein Brief ohne Absender, adressiert an „die, die zuhört“. Ich habe ihn bei Rosalind abgegeben.</p>', ARRAY['post']::text[], '/demo/schwarze-rose.jpg', 'image', false, 5)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000006', 'de000000-0000-4000-8000-010000000006', '', '<p>Neue Karte der Bucht, Entwurf drei. Die Sandbank ist wieder umgezogen.</p>', ARRAY['karten']::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-banner9.jpg', 'image', false, 6)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000009', 'de000000-0000-4000-8000-010000000006', '', '<p>Heute früh am Ende der Mole: ein Hirsch im Nebel. Oder ein Schatten mit Geweih. Ich zeichne ihn, bevor er sich überlegt, was er ist.</p>', ARRAY['sichtung','karten']::text[], '/demo/hirsch.jpg', 'image', false, 8)
on conflict (id) do nothing;

insert into public.posts (id, character_id, title, content, tags, media_url, media_type, pinned, bonus_likes)
values ('de000000-0000-4000-8000-020000000008', 'de000000-0000-4000-8000-010000000003', '', '<p>Wer hat meine zweite Teekanne gesehen? Sie ist blau und hat eine Delle.</p>', ARRAY['teestube']::text[], null, null, false, 4)
on conflict (id) do nothing;

insert into public.comments (id, post_id, character_id, content) values ('de000000-0000-4000-8000-030000000001', 'de000000-0000-4000-8000-020000000001', 'de000000-0000-4000-8000-010000000002', '<p>Ich habe sie schon angerempelt. Ich zahle.</p>') on conflict (id) do nothing;

insert into public.comments (id, post_id, character_id, content) values ('de000000-0000-4000-8000-030000000002', 'de000000-0000-4000-8000-020000000003', 'de000000-0000-4000-8000-010000000001', '<p>Die zweite Laterne ist dienstlich notwendig.</p>') on conflict (id) do nothing;

insert into public.comments (id, post_id, character_id, content) values ('de000000-0000-4000-8000-030000000003', 'de000000-0000-4000-8000-020000000004', 'de000000-0000-4000-8000-010000000005', '<p>Die Möwen sind immer beleidigt.</p>') on conflict (id) do nothing;

insert into public.comments (id, post_id, character_id, content) values ('de000000-0000-4000-8000-030000000004', 'de000000-0000-4000-8000-020000000008', 'de000000-0000-4000-8000-010000000004', '<p>Ich vermute einen Zusammenhang mit meiner Dampfmaschine. Keine Sorge.</p>') on conflict (id) do nothing;

insert into public.comments (id, post_id, character_id, content) values ('de000000-0000-4000-8000-030000000005', 'de000000-0000-4000-8000-020000000007', 'de000000-0000-4000-8000-010000000002', '<p>Und fragt nach den Laternen!</p>') on conflict (id) do nothing;

insert into public.comments (id, post_id, character_id, content) values ('de000000-0000-4000-8000-030000000006', 'de000000-0000-4000-8000-020000000002', 'de000000-0000-4000-8000-010000000006', '<p>Hebst du mir ein Stück auf? Ich komme nach dem Kartenzeichnen.</p>') on conflict (id) do nothing;

insert into public.story_arcs (id, world_id, name, created_by) values ('de000000-0000-4000-8000-080000000001', 'de000000-0000-4000-8000-000000000002', 'Die Laternenfrage', 'de000000-0000-4000-8000-000000000001') on conflict (id) do nothing;

insert into public.story_posts (id, world_id, character_id, title, content, location, in_world_time, pinned, archived, arc_id, recap, recap_by, recap_at)
values ('de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-010000000001', 'Willkommen im Windlichthafen', '<p>Der Nebel liegt tief über der Bucht, und die Laternen entlang der Mole beginnen zu glimmen. Mathilda steht am Ende des Stegs, das Logbuch unter dem Arm, und sieht einem kleinen Boot entgegen, das ohne Licht aus dem Dunst auftaucht.</p><p>»Na, wer kommt denn da?«, murmelt sie. »Wer immer es ist – der Tee ist schon heiß.«</p>', 'Ende der Nordmole', 'Abenddämmerung', true, false, null, null, null, null)
on conflict (id) do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000001') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000002') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000003') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000006') on conflict do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-050000000065', 'de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000003', '<p>Rosalind kommt mit einem Tablett über die Planken, darauf drei Tassen und ein Stück Kuchen unter einem Tuch. »Ich habe das Boot schon vom Fenster aus gesehen«, sagt sie. »Es fährt immer so, als wollte es sich entschuldigen.«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-050000000066', 'de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000002', '<p>Finn klettert die Leiter am Laternenpfahl hinunter und wischt sich die Hände an der Hose ab. »Es hat kein Licht«, stellt er fest. »Darf ich ihm eins leihen?«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-050000000067', 'de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000001', '<p>»Du darfst ihm eins anbieten«, sagt Mathilda und schlägt das Logbuch auf. »Leihen tun wir nur denen, die es zurückbringen.«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-050000000068', 'de000000-0000-4000-8000-040000000001', 'de000000-0000-4000-8000-010000000006', '<p>Ilvy lehnt am Geländer und hält ein Stück Papier ins Laternenlicht. »Seltsam. Auf meiner Karte liegt das Boot noch zwei Stege weiter links.« Sie lächelt. »Die Küste war gestern anders.«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_posts (id, world_id, character_id, title, content, location, in_world_time, pinned, archived, arc_id, recap, recap_by, recap_at)
values ('de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-010000000002', 'Die Laterne, die zweimal leuchtet', '<p>Finn schwört, dass die vierzehnte Laterne an der Nordmole jeden Abend zweimal angeht – einmal, wenn er sie anzündet, und einmal kurz nach Mitternacht, wenn niemand dort ist. Heute will er der Sache auf den Grund gehen.</p><p>Er hat Mathilda überredet, mit ihm im Lampenhaus zu warten, und Jorin gleich dazu, weil der immer zuhört, wenn jemand ›unerklärlich‹ sagt.</p>', 'Das Lampenhaus', 'Spätabend', false, false, 'de000000-0000-4000-8000-080000000001', null, null, null)
on conflict (id) do nothing;

insert into public.story_post_arcs (story_post_id, arc_id) values ('de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-080000000001') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000001') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000002') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000004') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000006') on conflict do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000c9', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000002', '<p>»Es fängt gleich an«, flüstert Finn und deutet durch das staubige Fenster auf den Pfahl am Wasser. »Seht ihr? Da. Noch nicht.«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000ca', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000004', '<p>Jorin hat eine Spule mit Draht und eine Blechdose mitgebracht, in die er hineinhorcht. »Wenn es ein Geist ist, schlägt der Zeiger aus«, erklärt er. »Wenn es eine Katze ist, der Zeiger auch. Ich habe nicht alles bedacht.«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000cb', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000001', '<p>Mathilda lässt das Logbuch sinken. »Zwei Stunden bis Mitternacht. Wer hat Tee dabei?« Niemand hat. Sie seufzt hörbar.</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000cc', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000002', '<p>Finn probiert das Schloss der Hintertür. Es klemmt, und er legt die Hand darauf und drückt vorsichtig. Die Tür bewegt sich nicht.</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind, roll_label, roll_value, roll_die, roll_result, roll_success)
values ('de000000-0000-4000-8000-0500000000cd', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000002', 'würfelt auf „Geschick“: 7/12 (W20) – Erfolg', 'entry', 'Geschick', 12, 20, 7, true) on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000ce', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000002', '<p>Das Schloss springt auf. Dahinter liegt eine kleine Kammer, in der ein Spiegel hängt, angelaufen und rund wie ein Kuchenteller. Auf dem Rahmen steht mit Kreide: ›Für die vierzehnte.‹</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind, chapter_title, chapter_summary)
values ('de000000-0000-4000-8000-0500000000cf', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000002', 'Der Fund im Lampenhaus', 'chapter', 'Der Fund im Lampenhaus', 'Der Spiegel in der Kammer, die Kreideschrift und die Frage, wer ihn hier aufgehängt hat.') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000d0', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000004', '<p>Jorin hält die Blechdose an den Spiegel. Der Zeiger zittert, schlägt aber nicht aus. »Gut«, murmelt er. »Das ist ein Fall für Ilvy. Die versteht Dinge, die woanders sind, als sie sein sollten.«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000d1', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000006', '<p>Ilvy steht plötzlich in der Tür, die Karte unterm Arm. »Man hat mich gerufen«, sagt sie ruhig. »Oder ich habe mich verlaufen, aber dann war es Absicht.«</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-0500000000d2', 'de000000-0000-4000-8000-040000000002', 'de000000-0000-4000-8000-010000000001', '<p>»Dann sind wir vollzählig«, sagt Mathilda. »Mitternacht.« Draußen, am vierzehnten Pfahl, fängt die Laterne an zu flackern – und beginnt zu leuchten.</p>', 'entry') on conflict (id) do nothing;

insert into public.story_posts (id, world_id, character_id, title, content, location, in_world_time, pinned, archived, arc_id, recap, recap_by, recap_at)
values ('de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-010000000003', 'Das Sommerfest am Pier', '<p>Zum Mittsommerfest hängt der ganze Hafen Girlanden zwischen die Laternen. Rosalind hat drei Kuchen gebacken, Jorin eine Konfettikanone gebaut, und Mathilda hat feierlich verkündet, dass heute niemand etwas ins Logbuch schreiben darf.</p>', 'Der große Pier', 'Mittsommer', false, true, null, 'Das Fest endete, wie es sollte: mit zu viel Kuchen, Konfetti im Logbuch und der Erkenntnis, dass die Girlanden eigentlich schon immer verkehrt herum hingen.', 'de000000-0000-4000-8000-000000000001', now())
on conflict (id) do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000001') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000002') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000003') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000004') on conflict do nothing;

insert into public.story_post_cast (story_post_id, character_id) values ('de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000005') on conflict do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-05000000012d', 'de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000003', '<p>»Der erste Kuchen ist für den, der das Konfetti verträgt«, ruft Rosalind und hält das Messer hoch. Alle sehen zu Jorin.</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-05000000012e', 'de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000004', '<p>»Es ist nur ein bisschen laut«, sagt Jorin. Dann zündet er die Kanone. Das Konfetti landet im Tee, in den Möwen und in Mathildas Logbuch.</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-05000000012f', 'de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000001', '<p>»Ich habe nichts gesehen«, sagt Mathilda und klappt das Logbuch zu. »Und nichts eingetragen.« Sie lacht, bis ihr die Tränen kommen.</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-050000000130', 'de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000002', '<p>Finn und Ilvy haben die Girlanden zuletzt aufgehängt. Zwei davon hängen verkehrt herum. Niemand sagt es ihnen. Es sieht gut aus.</p>', 'entry') on conflict (id) do nothing;

insert into public.story_entries (id, story_post_id, character_id, content, kind)
values ('de000000-0000-4000-8000-050000000131', 'de000000-0000-4000-8000-040000000003', 'de000000-0000-4000-8000-010000000005', '<p>Selma legt mit dem Postboot an und wirft eine Rolle Wimpel auf den Steg. »Ich bringe nur, was angekommen ist«, sagt sie. »Und heute ist alles angekommen.«</p>', 'entry') on conflict (id) do nothing;

insert into public.wiki_folders (id, world_id, name, created_by) values ('de000000-0000-4000-8000-060000000001', 'de000000-0000-4000-8000-000000000002', 'Orte', 'de000000-0000-4000-8000-000000000001') on conflict (id) do nothing;

insert into public.wiki_folders (id, world_id, name, created_by) values ('de000000-0000-4000-8000-060000000002', 'de000000-0000-4000-8000-000000000002', 'Personen', 'de000000-0000-4000-8000-000000000001') on conflict (id) do nothing;

insert into public.wiki_folders (id, world_id, name, created_by) values ('de000000-0000-4000-8000-060000000003', 'de000000-0000-4000-8000-000000000002', 'Hafenleben', 'de000000-0000-4000-8000-000000000001') on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000001', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Windlichthafen', '<h2>Beschreibung</h2><p>Der Windlichthafen liegt an einer Bucht, in der der Nebel gern übernachtet. Entlang der [[Die Nordmole|Nordmole]] stehen vierzehn Laternen, die [[Finn Lattenzaun]] jeden Abend anzündet. Wer ankommt, bekommt in der [[Teestube Zum Löffelchen]] zuerst einen Tee.</p><h2>Bewohner</h2><p>Die Hafenmeisterin [[Mathilda Brandt]] führt das Logbuch, die [[Die Laternenzunft|Laternenzunft]] kümmert sich um das Licht.</p><h2>Gerüchte</h2><p>Man sagt, die Küste sei jeden Tag ein kleines Stück anders. Die Kartenzeichnerin Ilvy bestätigt das ungern.</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-banner7.jpg', 'de000000-0000-4000-8000-060000000001', 'Ein kleiner Hafen, der nachts mehr leuchtet als der Himmel.', '[{"icon": "", "title": "Art des Ortes", "text": "Hafenstadt"}, {"icon": "", "title": "Einwohner", "text": "etwa 300, dazu Möwen"}]'::jsonb, 'ort', ARRAY['hafen','ort']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000002', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Die Nordmole', '<h2>Beschreibung</h2><p>Die Nordmole ragt weit in die Bucht. Jede Laterne hat einen Namen, den nur [[Finn Lattenzaun]] kennt. Die vierzehnte leuchtet zweimal – siehe die Szene „Die Laterne, die zweimal leuchtet“.</p>', 'de000000-0000-4000-8000-000000000001', ARRAY['Nordmole']::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-full8.jpg', 'de000000-0000-4000-8000-060000000001', 'Ein langer Steg mit vierzehn Laternen.', '[{"icon": "", "title": "Lage", "text": "Nordseite des Windlichthafens"}]'::jsonb, 'ort', ARRAY['ort']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000003', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Teestube Zum Löffelchen', '<h2>Beschreibung</h2><p>Die Teestube gehört [[Rosalind Tauwerk]]. Es gibt vierzehn Sorten Tee und genau einen Stuhl, der nicht wackelt. Wer ihn besetzt, muss eine Geschichte erzählen.</p>', 'de000000-0000-4000-8000-000000000001', ARRAY['Zum Löffelchen']::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-full15.jpg', 'de000000-0000-4000-8000-060000000001', 'Warm, laut und immer ein Stück Kuchen übrig.', '[{"icon": "", "title": "Art des Ortes", "text": "Teestube"}, {"icon": "", "title": "Besitzer:in", "text": "Rosalind Tauwerk"}]'::jsonb, 'ort', ARRAY['ort']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000004', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Mathilda Brandt', '<h2>Wer ist die Person?</h2><p>Mathilda leitet den Hafen seit zwanzig Jahren. Sie vergisst kein Gesicht und keinen Schuldschein, und sie hat eine Schwäche für Kuchen aus der [[Teestube Zum Löffelchen]].</p><h2>Beziehungen</h2><p>Mit [[Finn Lattenzaun]] verbindet sie eine Art Patenschaft: Sie hat ihm das Leiterklettern verboten – bislang erfolglos.</p>', 'de000000-0000-4000-8000-000000000001', ARRAY['Mathilda']::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/avatars/testdata/schattenmoor-av20.jpg', 'de000000-0000-4000-8000-060000000002', 'Hafenmeisterin und Hüterin des Logbuchs.', '[{"icon": "", "title": "Beruf", "text": "Hafenmeisterin"}, {"icon": "", "title": "Wohnort", "text": "Windlichthafen"}]'::jsonb, 'person', ARRAY['person']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000005', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Die Laternenzunft', '<h2>Überblick</h2><p>Die Laternenzunft pflegt die Laternen der [[Die Nordmole|Nordmole]] und führt Buch über jedes Flackern. Mitglied wird, wer einmal bei Wind eine Laterne angezündet hat, ohne zu fluchen.</p><p>Zunftmeisterin ist [[Mathilda Brandt]], Lehrling [[Finn Lattenzaun]].</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-full8.jpg', 'de000000-0000-4000-8000-060000000002', 'Wer für das Licht im Hafen sorgt.', '[{"icon": "", "title": "Anführer:in", "text": "Mathilda Brandt"}, {"icon": "", "title": "Sitz", "text": "Das Lampenhaus"}]'::jsonb, 'organisation', ARRAY['organisation']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000006', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Das Nebelhorn-Gesetz', '<h2>Die Erzählung</h2><p>Wenn das Nebelhorn zweimal ertönt, ruht im Hafen alle Arbeit, und jeder darf einen Tee verlangen. Erfunden hat das Horn [[Jorin Kesselbach]]; das Gesetz hat sich von selbst dazugedacht.</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], 'https://vdflmmdmezaersrssdci.supabase.co/storage/v1/object/public/post-media/testdata/schattenmoor-full4.jpg', 'de000000-0000-4000-8000-060000000003', 'Ein Gesetz, das nie jemand aufgeschrieben hat.', '[{"icon": "", "title": "Herkunft", "text": "Unklar"}, {"icon": "", "title": "Wahrheitsgehalt", "text": "Wird beim Tee ausgehandelt"}]'::jsonb, 'mythos', ARRAY['gesetz']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000007', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Wiki-Kurzanleitung', '<p>Eine Seite entsteht über „Neuer Wiki-Eintrag“. Gib einen Titel ein, schreib einen Text und wähle optional eine Art wie Ort oder Person.</p><p>Mit doppelten eckigen Klammern verlinkst du andere Seiten, zum Beispiel [[Windlichthafen]]. Gibt es die Seite noch nicht, erscheint der Link rot – ein Klick legt sie an.</p><p>Ordner, Karten und Seitenarten verwalten nur die Admins der Welt. Deine eigenen Seiten kannst du jederzeit bearbeiten.</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], null, 'de000000-0000-4000-8000-060000000003', 'So legst du eine eigene Seite an.', '[]'::jsonb, null, ARRAY['hilfe']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000008', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Das Sommerfest', '<h2>Was geschah?</h2><p>Girlanden, drei Kuchen, eine Konfettikanone und ein Logbuch, in dem nichts stand. Nachzulesen in der Szene „Das Sommerfest am Pier“.</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], '/demo/hexenkreis.jpg', 'de000000-0000-4000-8000-060000000003', 'Mittsommer am großen Pier.', '[{"icon": "", "title": "Ort", "text": "Der große Pier"}, {"icon": "", "title": "Beteiligte", "text": "Alle"}]'::jsonb, 'ereignis', ARRAY['fest']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-070000000009', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Der Nebelhund', '<h2>Aussehen</h2><p>Der Nebelhund ist hoch gewachsen, blass und fast ohne Fell, mit langen Schlappohren und einem Rückenkamm wie ein Segel. Er sitzt gern stundenlang still am Ende eines Stegs.</p><h2>Lebensweise</h2><p>Man sieht ihn vor allem bei Nebel. Er gilt als harmlos, solange man ihm nicht den Weg zur [[Teestube Zum Löffelchen]] versperrt; Kuchenreste mag er sehr.</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], '/demo/nebelhund.jpg', 'de000000-0000-4000-8000-060000000003', 'Weiß, lang und sehr leise – er wohnt unter den Stegen.', '[{"icon": "", "title": "Art", "text": "Hafenwesen"}, {"icon": "", "title": "Schwäche", "text": "Kuchen"}]'::jsonb, 'spezies', ARRAY['wesen']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-07000000000a', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Der Hirsch der Nordmole', '<h2>Die Erzählung</h2><p>Wer früh morgens am Ende der [[Die Nordmole|Nordmole]] steht, sieht manchmal einen Hirsch im Dunst. [[Ilvy Möwenstein|Ilvy]] hat ihn dreimal gezeichnet und jedes Mal an einer anderen Stelle eingetragen.</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], '/demo/hirsch.jpg', 'de000000-0000-4000-8000-060000000003', 'Ein Schatten mit Geweih, den nur der Nebel kennt.', '[{"icon": "", "title": "Herkunft", "text": "Unbekannt"}, {"icon": "", "title": "Wahrheitsgehalt", "text": "Ungeklärt"}]'::jsonb, 'mythos', ARRAY['mythos']::text[])
on conflict (id) do nothing;

insert into public.wiki_pages (id, world_id, category, title, content, created_by, aliases, cover_image_url, folder_id, lead, fields, page_type, tags)
values ('de000000-0000-4000-8000-07000000000b', 'de000000-0000-4000-8000-000000000002', 'sonstiges', 'Der Spiegel im Lampenhaus', '<h2>Beschreibung</h2><p>In einer Kammer hinter dem Lampenhaus der [[Die Nordmole|Nordmole]] hängt ein ovaler Spiegel, angelaufen und rund wie ein Kuchenteller. Mit Kreide steht auf dem Rahmen: „Für die vierzehnte.“</p><h2>Gerüchte</h2><p>Wer hineinsieht, erkennt sich selbst – nur eben ohne Gesicht. [[Jorin Kesselbach]] hat mit einer Blechdose daran gehorcht und keinen Ausschlag gefunden. Mehr in der Szene „Die Laterne, die zweimal leuchtet“.</p>', 'de000000-0000-4000-8000-000000000001', '{}'::text[], '/demo/spiegel.jpg', 'de000000-0000-4000-8000-060000000003', 'Rund, angelaufen und nicht ganz ehrlich.', '[{"icon": "", "title": "Art", "text": "Gegenstand"}, {"icon": "", "title": "Fundort", "text": "Kammer hinter dem Lampenhaus"}]'::jsonb, 'gegenstand', ARRAY['gegenstand']::text[])
on conflict (id) do nothing;

update public.story_posts set ambience_image_url = '/demo/hexenkreis.jpg' where id = 'de000000-0000-4000-8000-040000000001';

update public.story_posts set ambience_image_url = '/demo/spiegel.jpg' where id = 'de000000-0000-4000-8000-040000000002';

insert into public.character_relationships (id, world_id, character_a_id, character_b_id, type, label, created_by, category, color)
values ('de000000-0000-4000-8000-090000000001', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-010000000001', 'de000000-0000-4000-8000-010000000002', 'Patenschaft', 'Hat ihm das Leiterklettern verboten', 'de000000-0000-4000-8000-000000000001', 'freundschaft', '#3a8f5c') on conflict (id) do nothing;

insert into public.character_relationships (id, world_id, character_a_id, character_b_id, type, label, created_by, category, color)
values ('de000000-0000-4000-8000-090000000002', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-010000000003', 'de000000-0000-4000-8000-010000000001', 'Freundinnen', 'Teepausen seit zwanzig Jahren', 'de000000-0000-4000-8000-000000000001', 'freundschaft', '#c9822b') on conflict (id) do nothing;

insert into public.character_relationships (id, world_id, character_a_id, character_b_id, type, label, created_by, category, color)
values ('de000000-0000-4000-8000-090000000003', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-010000000004', 'de000000-0000-4000-8000-010000000006', 'Zusammenarbeit', 'Er baut, sie vermisst', 'de000000-0000-4000-8000-000000000001', 'buendnis', '#3a7fb0') on conflict (id) do nothing;

insert into public.character_relationships (id, world_id, character_a_id, character_b_id, type, label, created_by, category, color)
values ('de000000-0000-4000-8000-090000000004', 'de000000-0000-4000-8000-000000000002', 'de000000-0000-4000-8000-010000000005', 'de000000-0000-4000-8000-010000000003', 'Stammkundin', 'Bringt jeden Tag die Post – und bleibt zum Kuchen', 'de000000-0000-4000-8000-000000000001', 'sonstiges', '#8a6bb0') on conflict (id) do nothing;
