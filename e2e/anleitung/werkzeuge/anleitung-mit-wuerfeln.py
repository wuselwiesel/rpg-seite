import html
CSS = """
@page { size: A4; margin: 0 }
:root { --bg:#faf5ef; --ink:#3f3d4a; --soft:#6b6877; --acc:#4f5470; --rose:#b4455c; --card:#fff; --line:#eadfd3; --tint:#ece6f1; --ok:#1f7a45; --bad:#b3261e }
* { box-sizing: border-box }
body { margin:0; font-family: Inter, "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:var(--bg); -webkit-print-color-adjust:exact; print-color-adjust:exact }
.page { width:210mm; height:297mm; padding:16mm 16mm 14mm; page-break-after:always; position:relative; overflow:hidden; background:var(--bg) }
.page:last-child { page-break-after:auto }
h1,h2,h3 { font-family: Georgia, "Times New Roman", serif; font-weight:400; margin:0 }
h2 { font-size:26px; color:var(--acc); margin-bottom:3px }
h3 { font-size:16px; color:var(--acc); margin:0 0 4px }
.kicker { font-size:10.5px; letter-spacing:.16em; text-transform:uppercase; color:var(--rose); margin-bottom:6px }
p { font-size:12.5px; line-height:1.5; margin:0 0 8px }
.lead { font-size:14px; color:var(--soft); margin-bottom:12px; line-height:1.5 }
.foot { position:absolute; left:16mm; right:16mm; bottom:7mm; display:flex; justify-content:space-between; font-size:9.5px; color:var(--soft) }
.frame { background:var(--card); border:1px solid var(--line); border-radius:12px; overflow:hidden; box-shadow:0 5px 16px rgba(79,84,112,.13) }
.frame img { display:block; width:100% }
.bare img { display:block; width:100%; border-radius:12px; box-shadow:0 5px 16px rgba(79,84,112,.13) }
.cap { font-size:10.5px; color:var(--soft); margin-top:5px; text-align:center }
.legend { list-style:none; padding:0; margin:0 }
.legend li { display:flex; gap:9px; font-size:12px; line-height:1.45; margin-bottom:7px }
.legend .n { flex:none; width:20px; height:20px; border-radius:50%; background:var(--rose); color:#fff; font-weight:700; font-size:11px; display:flex; align-items:center; justify-content:center; margin-top:1px }
.legend b { color:var(--acc) }
.chip { display:inline-block; background:var(--tint); color:var(--acc); border-radius:999px; padding:2px 9px; font-size:11px; margin:0 3px 4px 0 }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:10px }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:9px }
.tile { background:var(--card); border:1px solid var(--line); border-radius:11px; padding:10px 12px }
.tile p { font-size:11.5px; color:var(--soft); margin:0 }
.note { background:var(--tint); border-radius:11px; padding:9px 13px; font-size:12px; line-height:1.5; color:var(--acc); margin:8px 0 }
.warn { background:#fbeaea; color:#7a2a2a }
.good { background:#e6f4ea; color:#245a35 }
.cols { display:grid; gap:16px; align-items:start }
.cols.big { grid-template-columns:1fr }
.cols.big > div:first-child { width:88mm; margin:0 auto }
.cols.big .legend { columns:2; column-gap:16px }
.legend li { break-inside:avoid }
.formula { background:#fff; border:1px solid var(--line); border-radius:12px; padding:10px 14px; font-size:13px; text-align:center; margin:8px 0 }
.formula b { color:var(--acc) }
table { border-collapse:collapse; width:100%; font-size:11.5px; background:#fff; border-radius:10px; overflow:hidden; border:1px solid var(--line) }
th { background:var(--tint); color:var(--acc); text-align:left; padding:6px 9px; font-weight:600 }
td { padding:6px 9px; border-top:1px solid var(--line); vertical-align:top }
.ok { color:var(--ok); font-weight:600 } .bad { color:var(--bad); font-weight:600 }
.cover { background:#23212c; color:#fff; padding:0 }
.cover .wrap { position:absolute; inset:0; padding:22mm 20mm; display:flex; flex-direction:column; justify-content:flex-end; background:linear-gradient(180deg,rgba(35,33,44,0) 25%,rgba(35,33,44,.92) 62%,#23212c 100%) }
.cover h1 { font-size:62px; letter-spacing:.01em }
.cover .sub { font-size:19px; margin-top:8px; opacity:.93; font-family:Georgia,serif }
.cover .pill { display:inline-block; border:1px solid rgba(255,255,255,.45); border-radius:999px; padding:3px 12px; font-size:11.5px; margin:0 5px 7px 0 }
.collage { position:absolute; left:0; right:0; top:0; height:170mm; display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(3,1fr) }
.collage img { width:100%; height:100%; object-fit:cover; display:block; filter:saturate(.9) }
.person { display:flex; gap:10px; background:#fff; border:1px solid var(--line); border-radius:11px; padding:8px; align-items:flex-start }
.person img { width:62px; height:62px; border-radius:50%; object-fit:cover; flex:none }
.person b { display:block; font-size:12.5px; color:var(--acc) } .person span { font-size:10.5px; color:var(--rose) } .person i { display:block; font-style:normal; font-size:11px; color:var(--soft); line-height:1.35; margin-top:2px }
.wiki { display:grid; grid-template-columns:1fr 1fr; gap:7px }
.wiki div { background:#fff; border:1px solid var(--line); border-radius:9px; padding:7px 10px; font-size:11px; color:var(--soft); line-height:1.35 }
.wiki b { color:var(--acc); font-size:12px; display:block } .wiki em { font-style:normal; font-size:9.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--rose) }
"""
pages = []
n = [0]
def page(body, foot=True, cls=""):
    n[0] += 1
    f = f'<div class="foot"><span>Wortwinkel · Anleitung</span><span>{n[0]}</span></div>' if foot else ""
    pages.append(f'<section class="page {cls}">{body}{f}</section>')
def head(kicker, title, lead=""):
    return f'<div class="kicker">{kicker}</div><h2>{title}</h2>' + (f'<p class="lead">{lead}</p>' if lead else "")
def legend(items):
    return '<ol class="legend">' + "".join(f'<li><span class="n">{i+1 if not isinstance(t,tuple) else t[0]}</span><div>{t if not isinstance(t,tuple) else t[1]}</div></li>' for i,t in enumerate(items)) + '</ol>'
def img(name, cls="frame"): return f'<div class="{cls}"><img src="j/{name}.jpg"></div>'

# 1 Cover
cov = "".join(f'<img src="j/av{i}.jpg">' for i in [11,20,13,12,19,16,14,15,18,8,9,10])
page(f'''<div class="collage">{cov}</div>
<div class="wrap"><div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;opacity:.8;margin-bottom:12px">Textbasiertes Rollenspiel</div>
<h1>Wortwinkel</h1><div class="sub">Die ausführliche Anleitung, Schritt für Schritt</div>
<div style="margin-top:22px"><span class="pill">Szenen</span><span class="pill">Schreiben &amp; Bündeln</span><span class="pill">Würfeln im Detail</span><span class="pill">Charakterbogen</span><span class="pill">Beziehungsnetz</span><span class="pill">Wiki &amp; Karten</span></div>
<div style="font-size:11px;opacity:.7;margin-top:10px">Alle Beispiele stammen aus der Welt „Schattenmoor“.</div></div>''', foot=False, cls="cover")

# 2 Überblick
page(head("Überblick","Das alles steckt in Wortwinkel","Eine App für eins: gemeinsam Geschichten schreiben. Geschlossener Kreis, ohne Werbung und ohne Tracking, Zugang per Einladungscode.") + '''
<div class="grid2">
<div class="tile"><h3>📖 Szenen</h3><p>Schreiben mit mehreren Figuren, auch mehrere in einer Nachricht. Kapitel, Zitate, Suche, Textstellen speichern. Seite 5–7.</p></div>
<div class="tile"><h3>🎲 Würfeln</h3><p>In der Szene, mit den Werten aus dem Charakterbogen der schreibenden Figur. Mit Bonus, Zustand, Glückspunkten. Seite 8–13.</p></div>
<div class="tile"><h3>🎭 Charakterbögen</h3><p>Angaben, Attribute, Talente, Notizen. Neue Charaktere kann die Welt-Leitung prüfen und genehmigen. Seite 14.</p></div>
<div class="tile"><h3>🕸️ Beziehungsnetz</h3><p>Wer steht zu wem? Verbündet, verfeindet, Familie, Liebe, in Farben und nach Häusern filterbar. Seite 15.</p></div>
<div class="tile"><h3>🗺️ Wiki &amp; Karten</h3><p>Eigenes Wiki je Welt mit verlinkten Seiten, Ordnern, Karten mit Pins, Zeitleiste und Kalender. Seite 16–17.</p></div>
<div class="tile"><h3>📋 Besetzung</h3><p>Für Serien-Welten: Rollenliste mit Anfrage, Zusage und „Charakter anlegen“. Seite 18.</p></div>
<div class="tile"><h3>💬 Chats &amp; Redaktion</h3><p>Chats mit Archiv, ein Feed für Beiträge, Fotos und Umfragen, Erwähnungen, Reaktionen, Badges. Tickets auf Seite 19, mehr auf Seite 20.</p></div>
<div class="tile"><h3>📚 Als Buch</h3><p>Alle Szenen einer Welt als PDF oder E-Book herunterladen. Seite 20.</p></div>
</div>
<div class="note"><b>Jede Welt nach Maß:</b> Würfeln, Schicksalswürfel, Haus oder Familie, Zitat, Status-Zeile und „Wesen“ lassen sich pro Welt einzeln ein- oder ausschalten. Was ausgeschaltet ist, taucht nirgends auf.</div>
<div class="note">Die Beispiele in dieser Anleitung kommen aus <b>Schattenmoor</b>, einem nebelverhangenen Moorland voller alter Gutshäuser, Flüsterwälder und Wesen, die man besser nicht beim Namen ruft.</div>''')

# 3 Schattenmoor Figuren
ppl = [
 ("Seraphine Vael","Moorhexe · Haus Vael","Moorhexe mit Schuppenhaut und goldenen Augen. Kennt jeden Pfad durch den Nebel – und jeden Preis.",11),
 ("Vesper Nachtsang","Haus Nachtsang","Silberhaarige Archivarin der Schattenbibliothek. Sammelt Flüsterworte, verbotene Karten und Geheimnisse.",20),
 ("Dorian Blackwood","Haus Nachtsang","Uralter Gutsherr von Schattenmoor. Höflich, hungrig und nie vor Sonnenuntergang zu sprechen.",13),
 ("Ysolde Nachtsang","Haus Nachtsang · „Zurück im Moor“","Vespers jüngere Schwester. Kam zurück, als niemand mehr mit ihr rechnete.",12),
 ("Tamsin Wermut","Orden der Nachtwächter · „Auf Streife“","Nachtwächterin im Orden. Trägt die Laterne und das Schweigegelübde nur halb.",16),
 ("Pia Aschenbach","„Singt am Brunnen“","Sieht mit den Augen nichts, im Nebel alles. Singt auf dem Marktplatz für Brot und hört, wer lügt.",14),
 ("Elowen Lichtwehr","Kapelle von Schattenmoor · „Gießt Kerzen“","Kerzenmacherin der Kapelle. Behauptet, die Flügel seien nur ein Kostüm.",15),
 ("Morwenna Krähenhall","Vampir · Kloster Sankt Veyr","Letzte Schwester des zerstörten Klosters Sankt Veyr. Trägt die Flügel unter dem Mantel und das Schweigen wie eine Rüstung.",19),
 ("Iselin Moorfeld","„Sammelt Sumpfdotter“","Kräuterfrau und Hebamme von Schattenmoor. Weiß, welche Pflanzen heilen und welche still machen.",18),
]
npcs = [("Die Moorwächterin",9),("Der Schattenschreiber",10),("Die Heilige der Asche",8),("Der Namenlose",17),("Das Geschrei",21)]
pp = "".join(f'<div class="person"><img src="j/av{a}.jpg"><div><b>{html.escape(nm)}</b><span>{html.escape(sub)}</span><i>{html.escape(t)}</i></div></div>' for nm,sub,t,a in ppl)
nn = "".join(f'<div style="text-align:center;font-size:10.5px;color:var(--soft)"><img src="j/av{a}.jpg" style="width:70px;height:70px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 4px">{html.escape(nm)}</div>' for nm,a in npcs)
page(head("Die Beispielwelt","Schattenmoor und seine Figuren","Mit diesen Figuren zeigen wir alles Weitere. So sehen Profilbilder, Haus und Status-Zeile in der App aus.") + f'<div class="grid2">{pp}</div><div style="margin-top:14px"><h3>Figuren der Spielleitung (NPCs)</h3><div style="display:flex;justify-content:space-between;margin-top:8px">{nn}</div></div>')

# 4 Erste Schritte (Text)
page(head("Erste Schritte","So fängst du an") + '''
<div class="grid2" style="margin-top:6px">
<div class="tile"><h3>1 · Konto &amp; Einladungscode</h3><p>Registrieren kannst du dich nur mit einem Einladungscode. Frag in der Gruppe nach einem. Danach meldest du dich mit E-Mail und Passwort an.</p></div>
<div class="tile"><h3>2 · Welt wählen</h3><p>Oben links siehst du deine Welt. Ein Tipp darauf wechselt sie. Du kannst mehreren Welten beitreten oder eine eigene gründen.</p></div>
<div class="tile"><h3>3 · Charakter anlegen</h3><p>Unter „Meine Charaktere“ legst du eine Figur an: Name, Profilbild, Haus, Zitat und Status-Zeile, je nach Einstellungen der Welt. Gibt es eine Prüfung, genehmigt die Welt-Leitung zuerst.</p></div>
<div class="tile"><h3>4 · Charakterbogen füllen</h3><p>Im Bogen trägst du Angaben, Attribute und Talente ein. Der Zufall-Generator hilft beim Würfeln der Werte.</p></div>
<div class="tile"><h3>5 · Szene betreten</h3><p>Im Bereich „Story“ liegen die Szenen. Öffne eine und schreibe weiter, sobald du dran bist. Ob und wann du dran bist, steht oben in der Szene.</p></div>
<div class="tile"><h3>6 · Drei Bereiche</h3><p>Oben wechselst du zwischen <b>Ingame</b> (Feed, Charakterbogen, Chats, Profil), <b>Story</b> (Szenen, Wiki, Charaktere) und <b>Redaktion</b> (Feed, Chat, Tickets, Verlauf, Profil).</p></div>
</div>
<div class="note"><b>Am Handy:</b> Die Seite läuft im Browser und lässt sich zum Startbildschirm hinzufügen. Dann verhält sie sich wie eine App. Die untere Leiste zeigt Symbol und Beschriftung.</div>
<div class="note"><b>Hilfe jederzeit:</b> Unter „Hilfe“ findest du alles mit einem Suchfeld. Rundgänge erklären die wichtigsten Seiten Schritt für Schritt.</div>''')

# 5 Szene lesen
page(head("Szenen","Eine Szene lesen","Eine Szene ist wie ein Gespräch, nur als Geschichte: Jede Figur schreibt mit Bild, Namen und Uhrzeit.") + f'''
<div class="cols" style="grid-template-columns:1.55fr 1fr">
<div>{img("szene")}<div class="cap">Ausschnitt aus „Die Glocke von Schattenmoor“</div></div>
<div>{legend([
 "<b>Titel und Kopf</b> der Szene: Name und Welt.",
 "<b>Nachricht</b> einer Figur mit Profilbild, Namen und Zeit. Die Schrift darf formatiert sein: fett, kursiv, unterstrichen, in verschiedenen Größen.",
 "<b>Würfelzeile</b>: Hat jemand gewürfelt, steht das als eigene schmale Zeile mit Ergebnis und Erfolg oder Misserfolg. Mehr dazu ab Seite 8.",
 "<b>Verlinkungen</b>: Erwähnte Figuren und Wiki-Begriffe sind anklickbar.",
])}
<div class="note"><b>Bearbeiten, löschen, markieren:</b> Eigene Nachrichten haben ein Stift- und Papierkorb-Symbol. Mit der Maus erscheinen sie beim Darüberfahren, am Handy nach einmal Antippen der Nachricht. Weitere Symbole: Flagge (als Ereignis für die Zeitleiste markieren) und Schild (als Spoiler verbergen).</div>
<div class="note good"><b>Lange Szenen:</b> Zuerst sind die neuesten Beiträge sichtbar. „Frühere Beiträge laden“ holt ältere nach, die Lesestelle bleibt dabei stehen. Ein Pfeil nach oben springt zum Anfang, „Zur letzten Nachricht“ zum Ende.</div>
</div></div>''')

# 6 Schreiben
page(head("Schreiben","Das Schreibfeld unter der Szene","Unter jeder Szene liegt das Schreibfeld mit drei Reitern: Schreiben, Würfeln, Chat.") + f'''
<div class="cols big">
<div>{img("schreiben0")}</div>
<div>{legend([
 "<b>Reiter „Schreiben“</b>: normale Nachricht in der Szene. Daneben „Würfeln“ (Seite 8) und „Chat“.",
 "<b>„Du schreibst als“</b>: die Figur, mit der du jetzt schreibst. Hast du mehrere Figuren in der Szene, wählst du hier um. Auch das Würfeln nutzt immer diese Figur.",
 "<b>Bündeln</b>: mehrere deiner Figuren in einer Nachricht (nächste Seite).",
 "<b>Textfeld</b>: schreiben, formatieren, mit <b>@</b> eine Figur erwähnen. Die Formatierungsleiste blendest du mit dem „T“ ein.",
 "<b>Weiterschreiben</b>: schickt die Nachricht ab.",
 "<b>ChaBo öffnen</b> (Karte): dein Charakterbogen als kleines Fenster, damit du Werte im Blick hast.",
 "<b>Als Erzähler:in schreiben</b> (Feder): Beitrag ohne Figur, für Erzähltext.",
 "<b>Neues Kapitel</b> (Buch): beginnt ein neues Kapitel, das du zur eigenen Szene machen kannst.",
 "<b>Formatierung anzeigen</b> (T): Leiste mit Schrift, Größe, Listen.",
 "<b>Danach dran</b>: wer als Nächstes schreiben soll. Standard „automatisch“: die Person, die zuletzt geschrieben hat, ist wieder dran.",
])}</div></div>''')

# 7 Bündeln + Zitat
page(head("Schreiben","Mehrere Figuren in einer Nachricht","Mit „Bündeln“ lässt du mehrere deiner Figuren nacheinander in einer Nachricht auftreten – für Szenen, in denen alle gleichzeitig handeln.") + f'''
<div class="cols" style="grid-template-columns:1fr 1fr">
<div>{img("schreiben1")}<div class="cap">„Bündeln“ ist eingeschaltet: ein Block je Figur</div></div>
<div>
<ol class="legend">
<li><span class="n">1</span><div>Tippe auf <b>Bündeln</b>. Es erscheint für jede Figur ein eigener Block mit Profilbild und Namen.</div></li>
<li><span class="n">2</span><div>Über den Pfeil neben dem Namen wählst du, welche deiner Figuren in diesem Block spricht.</div></li>
<li><span class="n">3</span><div>Mit <b>+ Weitere Figur</b> fügst du einen weiteren Block hinzu.</div></li>
<li><span class="n">4</span><div>Mit <b>Weiterschreiben</b> wird alles als <b>eine</b> Nachricht abgeschickt. In der Szene sind die Figuren als einzelne Abschnitte mit Bild und Namen zu sehen.</div></li>
</ol>
<div class="note">Ein Bündel zählt als ein Beitrag, steht aber in „Zuletzt geschah“ und in Suchtreffern bei jeder Figur einzeln.</div>
</div></div>
<h3 style="margin-top:12px">Textstellen zitieren und speichern</h3>
<div class="grid2">
<div class="tile"><h3>Im Chat zitieren</h3><p>Markiere in einer Szene Text innerhalb einer Nachricht, auch über mehrere Nachrichten (höchstens 6). Daneben erscheint „Im Chat zitieren“: Die Textstelle wird als Zitat in den Chat gesetzt, mit Strich links und dem Namen der Figur.</p></div>
<div class="tile"><h3>Speichern</h3><p>„Speichern“ legt die Textstelle als Ausschnitt in die Sammlung deiner Figuren. Du vergibst Titel, Notiz und Sammlung und kannst sie ins Wiki übernehmen.</p></div>
</div>''')

# 8 Würfeln 1
page(head("Würfeln · 1","Wie das Würfeln funktioniert","Gewürfelt wird direkt in der Szene, im Reiter „Würfeln“. Das Ergebnis erscheint für alle als Zeile in der Szene.") + f'''
<div class="formula"><b>Wurf ≤ Wert = Erfolg</b> &nbsp; · &nbsp; je <b>niedriger</b> der Wurf, desto besser</div>
<div class="cols big" style="margin-top:8px">
<div>{img("w0")}<div class="cap">Der Reiter „Würfeln“ für Seraphine Vael</div></div>
<div>{legend([
 "<b>Worauf würfelst du?</b> (Pflicht) Eine kurze Beschreibung der Handlung, z. B. „Den Nebel beschwören“. Sie steht später in der Szene.",
 "<b>Wert übernehmen</b> (optional): holt einen Wert aus dem Charakterbogen der Figur.",
 "<b>Wert</b> (optional): die Zahl, unter oder auf die gewürfelt werden muss. Ohne Wert würfelst du frei.",
 "<b>Bonus</b> (optional): erleichtert (+) oder erschwert (−) die Probe.",
 "<b>Würfel</b>: W4, W6, W8, W10, W12, W20 oder W100. Standard ist W20.",
 "<b>Gegen wen?</b> (optional): richtet den Wurf an eine andere Figur.",
 "<b>Würfeln</b>: würfelt und schreibt die Zeile in die Szene.",
])}</div></div>
<div class="note good"><b>Das Wichtigste in einem Satz:</b> Pflicht ist nur das Feld „Worauf würfelst du?“ – alles andere ist optional.</div>
<div class="note">Oben im Würfelfeld steht, wie viele <b>Glückspunkte</b> deine Figur in dieser Szene noch hat (die grünen Kleeblätter). Mehr dazu auf Seite 12.</div>''')

# 9 Würfeln 2 Wert aus Bogen
page(head("Würfeln · 2","Mit einem Wert aus dem Charakterbogen","So würfelst du eine echte Probe auf ein Attribut oder Talent.") + f'''
<div class="cols big">
<div>{img("w1")}<div class="cap">Intuition (14) gewählt, Bonus +2</div></div>
<div>{legend([
 "Beschreibe die Handlung: „Pfad durch den Nebel finden“.",
 "Wähle bei <b>Wert übernehmen</b> einen Eintrag aus dem Bogen, getrennt nach <b>Attribute</b> und <b>Talente</b>. Die Zahl in Klammern ist der Gesamtwert der Figur.",
 "Der Wert steht jetzt automatisch im Feld <b>Wert</b>. Unter dem Auswahlfeld steht, welcher Eintrag gewählt ist, mit „entfernen“, falls du es dir anders überlegst.",
 "Der <b>Bonus</b> wird zum Wert gerechnet. +2 macht die Probe leichter, −2 schwerer.",
])}
<div class="note"><b>Wechselst du die Figur</b> (Schreibfeld, „Du schreibst als“), gelten sofort die Werte der neuen Figur. Es wird immer der Bogen der gerade gewählten Figur genommen.</div>
<div class="note"><b>Eigenen Wert eintragen?</b> Das geht auch: einfach die Zahl ins Feld „Wert“ schreiben. Dann gehört sie nicht mehr zum Eintrag im Bogen.</div>
</div></div>
<h3 style="margin-top:10px">Ein Beispiel von A bis Z</h3>
<table><tr><th>Schritt</th><th>Eingabe / Ergebnis</th></tr>
<tr><td>Wert aus dem Bogen</td><td>Intuition = 14 (Basis 12 + Bonus 2 aus dem Bogen)</td></tr>
<tr><td>Bonus beim Würfeln</td><td>+2</td></tr>
<tr><td>Zielwert</td><td>14 + 2 = <b>16</b></td></tr>
<tr><td>Wurf (W20)</td><td>11</td></tr>
<tr><td>Ergebnis</td><td class="ok">11 ≤ 16 → Erfolg. Die Zeile lautet: „würfelt auf ‚Pfad durch den Nebel‘ (Intuition): 11/16 (14+2) (W20) Erfolg“</td></tr></table>''')

# 10 Zustand
page(head("Würfeln · 3","Zustand und Bonus","Manchmal ist eine Figur im Nachteil: betrunken, erschöpft, abgelenkt. Dafür gibt es den Zustand und den Bonus.") + f'''
<div class="cols big">
<div>{img("w2")}<div class="cap">Konstitution (9), Zustand „Betrunken – Stark“</div></div>
<div>{legend([
 "Der <b>Wert</b> ist gesetzt: Konstitution 9.",
 "<b>Zustand</b> (optional): erscheint erst, wenn ein Wert eingetragen ist. Ohne Wert gibt es nichts abzuziehen.",
 "<b>Stärke</b>: Leicht −2, Mittel −4, Stark −6, Sehr stark −8. Jede Stufe zieht eine feste Zahl vom Zielwert ab.",
])}
<table><tr><th>Stufe</th><th>Abzug</th></tr><tr><td>Leicht</td><td>−2</td></tr><tr><td>Mittel</td><td>−4</td></tr><tr><td>Stark</td><td>−6</td></tr><tr><td>Sehr stark</td><td>−8</td></tr></table>
</div></div>
<h3 style="margin-top:10px">Bonus und Zustand zusammen</h3>
<table><tr><th>Wert</th><th>Bonus</th><th>Zustand</th><th>Zielwert</th><th>Wurf</th><th>Ergebnis</th></tr>
<tr><td>14</td><td>+2</td><td>–</td><td>16</td><td>11</td><td class="ok">Erfolg</td></tr>
<tr><td>14</td><td>0</td><td>Betrunken, stark (−6)</td><td>8</td><td>17</td><td class="bad">Misserfolg</td></tr>
<tr><td>9</td><td>+3</td><td>Betrunken, leicht (−2)</td><td>10</td><td>7</td><td class="ok">Erfolg</td></tr></table>
<div class="note">Der Zielwert ist nie kleiner als 1. Die fertige Zeile in der Szene zeigt den Zustand an, zum Beispiel: „würfelt auf ‚Wein vertragen‘ · Betrunken (stark): 17/8 (14-6) (W20) Misserfolg“. Bonus und Zustand ändern den <b>Zielwert</b>, nicht den Wurf selbst.</div>''')

# 11 Frei + Gegen wen
page(head("Würfeln · 4","Freier Wurf und „Gegen wen?“") + f'''
<div class="cols" style="grid-template-columns:1fr 1fr">
<div><h3>Freier Wurf (ohne Wert)</h3>{img("w3")}<div class="cap">Kein Wert, W6 gewählt</div>
<ol class="legend" style="margin-top:8px">
<li><span class="n">1</span><div>Nur die Beschreibung ausfüllen.</div></li>
<li><span class="n">2</span><div>Das Feld <b>Wert</b> bleibt leer („frei würfeln“).</div></li>
<li><span class="n">3</span><div>Beliebigen Würfel wählen, hier W6.</div></li>
</ol>
<div class="note">Ein freier Wurf hat kein Erfolg oder Misserfolg, nur eine Zahl: „würfelt auf ‚Wer lacht da im Nebel?‘: 4 (W6)“. Gut für Zufallsentscheidungen, Tabellen und Spielleitung.</div></div>
<div><h3>Gegen eine Figur würfeln</h3>{img("w4")}<div class="cap">Wurf auf „Flüsterwort verstehen“ gegen Dorian</div>
<ol class="legend" style="margin-top:8px">
<li><span class="n">1</span><div>Bei <b>Gegen wen?</b> wählst du eine andere Figur der Szene. Standard ist „Niemanden – nur für dich“.</div></li>
</ol>
<div class="note">Die Zeile in der Szene zeigt „gegen Dorian Blackwood“. Die Person, der die Figur gehört, bekommt eine Benachrichtigung, etwa „hat erfolgreich auf ‚Flüsterwort verstehen‘ gegen dich gewürfelt“ oder „– ohne Erfolg“.</div></div>
</div>''')

# 12 Glückspunkte
page(head("Würfeln · 5","Glückspunkte: noch ein Versuch","Wenn ein Wurf misslingt, kann man einen Glückspunkt einsetzen und es noch einmal versuchen.") + f'''
<div class="cols big">
<div>{img("w5")}<div class="cap">Nach einem Misserfolg fragt die App nach dem Glückspunkt</div></div>
<div>{legend([
 "<b>Glückspunkte in dieser Szene</b>: die grünen Kleeblätter zeigen, wie viele noch übrig sind. Gezählt wird pro Figur und Szene.",
 "<b>„Glückspunkt nutzen?“</b> erscheint nach einem <b>missglückten Wurf mit Wert</b>, solange noch Punkte übrig sind.",
 "<b>„Ja, nochmal würfeln“</b> setzt einen Punkt ein und würfelt neu mit denselben Angaben. In der Szene steht dann: „setzt einen Glückspunkt ein und würfelt erneut auf …“. <b>„Nein“</b> lässt es dabei.",
])}
<div class="formula"><b>Glückspunkte pro Szene = abgerundet(Glück ÷ 5) + 1</b></div>
<table><tr><th>Glück (Basis)</th><th>Punkte</th></tr><tr><td>1–4</td><td>1</td></tr><tr><td>5–9</td><td>2</td></tr><tr><td>10–14</td><td>3</td></tr><tr><td>15–19</td><td>4</td></tr></table>
<p style="margin-top:8px">Seraphine hat Glück 10 und damit <b>3 Punkte</b> pro Szene.</p>
</div></div>
<div class="note warn"><b>Wichtig:</b> Die Kleeblätter gibt es nur, wenn der Charakterbogen einen Glück-Wert hat. Ohne Bogen kannst du trotzdem frei würfeln, hast aber keine Glückspunkte.</div>''')

# 13 Würfelzeilen lesen
page(head("Würfeln · 6","Würfelzeilen in der Szene lesen","So sieht jede Variante aus. Alle Zeilen gehören zu Figuren aus Schattenmoor.") + f'''
{img("wurfzeilen","bare")}
<table style="margin-top:12px"><tr><th>Zeile</th><th>So liest du sie</th></tr>
<tr><td>Vesper · 5/14 (W20) <span class="ok">Erfolg</span></td><td>Wurf 5, Zielwert 14, 5 ≤ 14, also Erfolg. Kein Bonus.</td></tr>
<tr><td>Dorian · 20/12 (W20) <span class="bad">Misserfolg</span></td><td>Wurf 20, Zielwert 12, 20 &gt; 12, also Misserfolg.</td></tr>
<tr><td>Seraphine · (Intuition): 11/16 (14+2) (W20) <span class="ok">Erfolg</span> 🍀🍀🍀</td><td>Wert aus dem Bogen (Intuition, 14) + Bonus 2 = Zielwert 16. Drei Kleeblätter: 3 Glückspunkte übrig.</td></tr>
<tr><td>Vesper · … gegen Dorian Blackwood: 3/16</td><td>Wurf gegen eine andere Figur. Sie wird benachrichtigt.</td></tr>
<tr><td>Dorian · Betrunken (stark): 17/8 (14-6) <span class="bad">Misserfolg</span></td><td>Wert 14, Zustand „stark“ zieht 6 ab: Zielwert 8. Wurf 17 &gt; 8, also Misserfolg. Zwei Kleeblätter: 2 Punkte übrig.</td></tr>
<tr><td>Tamsin · 4 (W6)</td><td>Freier Wurf ohne Wert: nur die Zahl, kein Erfolg oder Misserfolg.</td></tr></table>
<div class="note"><b>Welche Figur würfelt?</b> Immer die, die im Schreibfeld unter „Du schreibst als“ ausgewählt ist. Deren Charakterbogen liefert die Werte.</div>''')

# 14 Charakterbogen
page(head("Charakterbogen","Der Bogen deiner Figur","Zu jeder Figur gehört ein Bogen. Hier der von Seraphine Vael.") + f'''
<div class="cols" style="grid-template-columns:1.1fr 1fr;margin-top:2px">
<div>{img("chabo")}</div>
<div>{legend([
 "<b>Kopf</b>: Profilbild, Name und die Angaben der Figur: Titel, Vorname, Nachname, Alter, Wesen, Rang. Das Fragezeichen erklärt den Bogen.",
 "<b>Beziehungen</b>: Familie, Verbündete, Rivalen. Die Überschrift lässt sich umbenennen.",
 "<b>Attribute</b>: zehn Werte, jeweils mit Kürzel, Basis und Bonus: Mut, Intelligenz, Gewandtheit, Konstitution, Intuition, Körperkraft, Fingerfertigkeit, Charisma, Selbstbeherrschung, Glück.",
 "<b>Glück</b> zeigt auch die Glückspunkte pro Szene (Seite 12).",
 "<b>Talente</b>: Liste mit Basis, Bonus und Gesamtwert, abgeleitet aus den Attributen. Die Welt-Leitung kann sie anpassen.",
 "<b>Notizen</b>: freie Blöcke mit Überschrift, z. B. „Geschichte“.",
])}
<div class="note"><b>Bearbeiten:</b> Ein Stift oben rechts am Kopf, sichtbar beim Darüberfahren oder Antippen. Im Bearbeiten-Modus gibt es „Alles zufällig“ und „Rückgängig“.</div>
<div class="note"><b>Besondere Natur:</b> Wer eine besondere Natur wählt (z. B. Vampir), bekommt passende Boni auf Attribute und Talente.</div>
<div class="note good"><b>Prüfung:</b> Schaltet die Welt „Neue Charaktere prüfen“ ein, genehmigt oder lehnt die Welt-Leitung ab oder schlägt Änderungen vor. Genehmigte Figuren tragen den Chip „Genehmigt“.</div>
</div></div>''')

# 15 Netz
page(head("Beziehungen","Das Beziehungsnetz","Jede Linie ist eine Beziehung. Die Farbe zeigt die Art, der Rand um das Bild das Haus.") + f'''
<div class="cols" style="grid-template-columns:1fr 1fr">
<div>{img("netz")}<div class="cap">Ganze Welt: alle Figuren von Schattenmoor</div></div>
<div>{img("netz-fokus")}<div class="cap">Fokus auf Dorian Blackwood: nur seine Beziehungen</div></div></div>
<div style="margin-top:12px" class="cols">
<div class="grid2">
<div class="tile"><h3>Fokussieren</h3><p>Suche oben eine Figur und tippe sie an. Es bleiben nur ihre Beziehungen sichtbar. „Direkt“ zeigt die unmittelbaren, „+ Bekannte“ auch die Beziehungen der Bekannten.</p></div>
<div class="tile"><h3>Häuser</h3><p>Die Chips „Haus Nachtsang“, „Haus Vael“, „Kapelle von Schattenmoor“ … zeigen nur Figuren dieses Hauses. Der Rand um das Profilbild hat die Farbe des Hauses.</p></div>
<div class="tile"><h3>Farben</h3><p>Die Legende unten nennt die Arten: Verfeindet, Rivalen, Verbündet, Mutter und Sohn, Ehepaar, Geschwister, Freundinnen, Heimliche Liebe, Misstrauen, Schuldner.</p></div>
<div class="tile"><h3>Bedienen</h3><p>Mit + und − zoomst du, mit dem Pfeil setzt du die Ansicht zurück. Ziehen verschiebt. Die Zeitleiste zeigt, wie sich Beziehungen entwickelt haben.</p></div>
</div></div>
<div class="note">Familienbeziehungen erscheinen außerdem im <b>Stammbaum</b>. Wenn „Haus / Familie“ in der Welt ausgeschaltet ist, entfallen die Hausfarben.</div>''')

# 16 Wiki + Karte
wk = [("Das Gutshaus Blackwood","Ort","Uraltes Herrenhaus am Rand des Moors. Die Fenster sind seit Jahrzehnten verhangen, die Kellertür steht nachts offen."),
("Die Kapelle von Schattenmoor","Ort","Verfallene Kapelle am Moorrand. Ihre Glocke schlägt dreimal, wenn im Archiv jemand nicht mehr allein ist."),
("Schattenbibliothek","Ort","Ein Archiv im Keller des Gutshauses, dessen Regale länger sind, als der Raum es erlaubt."),
("Der Orden der Nachtwächter","Fraktion","Sie patrouillieren nach Sonnenuntergang durch die Gassen und stellen keine Fragen. Ihr Zeichen: eine Laterne mit schwarzer Flamme."),
("Die Moorwächterin","NPC","Auf einem moosbewachsenen Findling am Rand des Moors sitzt sie, die Flügel zerrissen, das Haar bis auf den Boden."),
("Das Geschrei","Sonstiges","Wenn der Nebel so dicht wird, dass die Laternen erlöschen, beginnt das Geschrei.")]
ww = "".join(f'<div><em>{c}</em><b>{html.escape(t)}</b>{html.escape(x)}</div>' for t,c,x in wk)
page(head("Wiki &amp; Karten","Wissen der Welt, verlinkt","Jede Welt hat ein Wiki. Seiten, Ordner, Karten, Zeitleiste und Kalender.") + f'''
<h3>Wiki-Seiten (Auszug aus Schattenmoor)</h3><div class="wiki" style="margin-top:6px">{ww}</div>
<div class="note"><b>Verlinken:</b> Mit <b>[[Seitenname]]</b> verlinkst du eine Seite, mit <b>[[Seitenname|Text]]</b> unter anderem Text. Im Editor gibt es dafür den Knopf „[[ ]]“, auch in der schwebenden Leiste über markiertem Text. Unbekannte Titel werden als roter Link angezeigt („Fehlende Artikel“). Einzahl und Mehrzahl werden erkannt.</div>
<h3 style="margin-top:8px">Karte mit Pins</h3>
<div style="display:grid;grid-template-columns:1.3fr 1fr;gap:14px;align-items:start;margin-top:6px">
<div>{img("karte")}<div class="cap">Beispielkarte: Orte von Schattenmoor als Pins</div></div>
<div>{legend(["Jeder <b>Pin</b> führt auf eine Wiki-Seite oder eine weitere Karte.","Mit <b>+ / − / Pfeil</b> zoomst du und setzt zurück.","<b>Pins bearbeiten</b> (nur für Berechtigte): Pins setzen, beschriften, ein Emoji wählen, ein Ziel angeben.","Die Chips unter der Karte listen alle Pins."])}</div></div>''')


# 17 Wiki-Editor
page(head("Wiki","Im Wiki schreiben und verlinken","Wiki-Seiten schreibst du in einem Editor mit Formatierung. Das Besondere: Du verlinkst andere Seiten mit einem Klick.") + f'''
<div class="cols" style="grid-template-columns:1fr 1fr">
<div>{img("editor1")}<div class="cap">Text markieren: Eine schwebende Leiste erscheint, mit „[[ ]]“ ganz rechts</div></div>
<div>{img("editor2")}<div class="cap">Nach dem Tippen auf „[[ ]]“: die Suche mit der Markierung als Vorschlag</div></div></div>
<div class="cols" style="grid-template-columns:1fr 1fr;margin-top:14px">
<div>{legend([
 "<b>Text markieren</b> – zum Beispiel „Gutshaus Blackwood“.",
 "In der schwebenden Leiste auf <b>[[ ]]</b> tippen. Das Suchfeld ist schon mit deiner Markierung gefüllt.",
 "Die passende Seite aus der Liste wählen. Der Text wird zu <b>[[Seitenname|markierter Text]]</b>, bei gleichem Text zu <b>[[Seitenname]]</b>.",
 "Gibt es die Seite noch nicht, wählst du <b>„… verlinken (Seite fehlt noch)“</b>. Der Link ist rot, bis die Seite angelegt ist, und taucht unter „Fehlende Artikel“ auf.",
])}</div>
<div>
<h3>Die feste Leiste oben</h3>
<p style="font-size:11.5px"><span class="chip">F fett</span><span class="chip">K kursiv</span><span class="chip">U unterstrichen</span><span class="chip">S durchgestrichen</span><span class="chip">H2 / H3 Überschriften</span><span class="chip">Schriftgröße</span><span class="chip">Listen</span><span class="chip">Zitat</span><span class="chip">Emoji &amp; Symbole</span><span class="chip">[[ ]] Wiki-Link</span><span class="chip">Link</span><span class="chip">Bild</span><span class="chip">Hinweis</span><span class="chip">Spoiler</span><span class="chip">Tabelle</span><span class="chip">PDF</span></p>
<div class="note">Mit <b>@</b> erwähnst du Figuren der Welt. Einzahl und Mehrzahl werden erkannt: <b>[[Sirenen]]</b> findet die Seite „Sirene“.</div>
</div></div>''')

# 18 Besetzung
page(head("Besetzung","Die Rollenliste einer Welt","Für Welten, die eine Serie oder Vorlage nachspielen: Jede Rolle steht in der Liste, und du siehst auf einen Blick, was frei ist.") + f'''
<div class="cols" style="grid-template-columns:1fr 1fr">
<div>{img("besetzung")}<div class="cap">Liste mit Anfangsbuchstaben und Stand</div></div>
<div>{img("besetzung2")}<div class="cap">Eine freie Rolle aufgeklappt: „Rolle anfragen“</div></div></div>
<div class="cols" style="grid-template-columns:1fr 1fr;margin-top:12px">
<div>{legend([
 "<b>Kopf</b>: Fortschrittsbalken und „3 von 7 vergeben“, darunter die Zahlen für Frei, Reserviert, Vergeben und NPC.",
 "<b>Suche und Filter</b>: nach Name oder Wesen suchen, mit „Filtern“ Quelle, Wesen und Lebende oder Verstorbene eingrenzen. Die Buchstabenleiste springt zum Anfangsbuchstaben.",
 "<b>Stand</b> je Rolle: Frei, Reserviert (für eine Person, mit „Zugesagt, Charakter fehlt noch“, wenn die Zusage da ist), Vergeben (mit einer Figur verknüpft) oder NPC.",
])}</div>
<div>
<h3>So bekommst du eine Rolle</h3>
<ol class="legend" style="margin-top:6px">
<li><span class="n">1</span><div>Rolle aufklappen und <b>Rolle anfragen</b> tippen.</div></li>
<li><span class="n">2</span><div>Die Welt-Leitung sagt zu oder lehnt ab. Sie sieht offene Anfragen als Zahl am Reiter „Besetzung“.</div></li>
<li><span class="n">3</span><div>Bei einer Zusage erscheint <b>Charakter anlegen</b>. Der Name der Rolle ist schon eingetragen.</div></li>
<li><span class="n">4</span><div>Ist die Figur angelegt, steht die Rolle auf <b>Vergeben</b>.</div></li>
</ol>
<div class="note">Die Welt-Leitung kann Rollen für einen Namen reservieren (auch mit Frist), als NPC markieren, mit einer Figur verknüpfen und die Liste aus Wiki-Seiten importieren.</div>
</div></div>''')

# 19 Tickets
page(head("Tickets","Fehler melden, Wünsche äußern, Fragen stellen","Unter Redaktion → Tickets liegt ein Postfach wie bei einer E-Mail. Die Liste links, der Verlauf eines Tickets rechts.") + f'''
<div class="cols" style="grid-template-columns:1fr 1.5fr">
<div>{img("tickets")}<div class="cap">Deine Tickets nach Stand sortiert</div></div>
<div>{img("ticket")}<div class="cap">Der Verlauf eines Tickets mit Antwortfeld</div></div></div>
<div class="cols" style="grid-template-columns:1fr 1fr;margin-top:12px">
<div>{legend([
 "<b>+ Neu</b>: ein Ticket anlegen. Du wählst die Art (Fehler, Wunsch oder Frage), schreibst Titel und Text und hängst Screenshots an.",
 "<b>Nummer</b>: Jedes Ticket bekommt automatisch eine Nummer wie „#12“.",
 "<b>Stand</b>: Offen, In Arbeit, Erledigt. Ein Punkt zeigt Ungelesenes.",
])}</div>
<div>{legend([
 "<b>Verlauf</b>: deine Meldung, Statuswechsel und Antworten der Betreiberin in einer Reihe.",
 "<b>Antworten</b> kannst du mit Text und Bildern. Neue Antworten und Statuswechsel erscheinen live, ohne die Seite neu zu laden.",
 "<b>Meldungen</b>: Du bekommst eine Benachrichtigung bei Antworten und neuem Stand. Die Gerätedaten (Browser, Fenstergröße) hängen automatisch an, das hilft bei der Fehlersuche.",
])}</div></div>
<div class="note"><b>Datenschutz:</b> Screenshots liegen in einem privaten Speicher. Nur du und die Betreiberin sehen sie. Sie werden mit deinem Konto gelöscht.</div>''')

# 20 Weiteres
page(head("Mitmachen","Besetzung, Chats, Welten, Zugang") + '''
<div class="grid2" style="margin-top:6px">
<div class="tile"><h3>📋 Besetzung (Rollenliste)</h3><p>Für Serien-Welten: Siehe Seite 18: Rollen mit Stand Frei, Reserviert, Vergeben oder NPC. Du fragst an, die Welt-Leitung sagt zu, dann legst du mit „Charakter anlegen“ die Figur an.</p></div>
<div class="tile"><h3>💬 Chats</h3><p>Zu zweit oder in Gruppen, in der Welt oder in der Redaktion. Das Menü „…“ bietet <b>Archivieren</b> und <b>Chat löschen</b>. Eine neue Nachricht holt einen archivierten Chat zurück.</p></div>
<div class="tile"><h3>📰 Redaktion</h3><p>Dein Konto-Bereich: Feed für Beiträge, Fotos, Videos und Umfragen, mit Erwähnungen, Reaktionen und Badges zum Verleihen. Beiträge lassen sich nachträglich bearbeiten.</p></div>
<div class="tile"><h3>🎫 Tickets</h3><p>Fehler, Wünsche oder Fragen? Siehe Seite 19: Postfach unter „Redaktion → Tickets“, mit Nummer, Verlauf und Screenshots.</p></div>
<div class="tile"><h3>🌍 Eigene Welten</h3><p>Du gründest eine Welt, lädst per Einladungslink ein, vergibst Rollen und stellst die Regeln ein. Verwalten: Welt · Übersicht · Charaktere · Einstellungen.</p></div>
<div class="tile"><h3>⚙️ Regeln pro Welt</h3><p>Einzeln ein- und ausschaltbar: Würfeln, Schicksalswürfel, Haus/Familie, Zitat, Status-Zeile, Wesen, Besetzung, „Neue Charaktere prüfen“, Meldungen je Ereignis.</p></div>
</div>
<h3 style="margin-top:10px">Szenen als Buch</h3>
<p>In der Story gibt es oben rechts „PDF / E-Book“. Das Buch enthält alle Szenen der Welt, die du sehen darfst. PDF ist der Druckdialog deines Browsers, das E-Book ein EPUB.</p>
<div class="note good"><b>Zugang &amp; Datenschutz:</b> Ein Konto gibt es nur mit Einladungscode. Öffentliche Welten sehen nur angemeldete Mitglieder. Es gibt keine Werbung und keine Analyse-Werkzeuge, die Seite ist für Suchmaschinen gesperrt.</div>
<div class="note"><b>Nicht gefunden?</b> Die Hilfe in der App hat ein Suchfeld und 20 Abschnitte. Bei Fehlern hilft ein Ticket.</div>''')

open("anleitung2.html","w").write(f'<!doctype html><html lang="de"><meta charset="utf-8"><title>Wortwinkel – Anleitung</title><style>{CSS}</style><body>{"".join(pages)}</body></html>')
print(len(pages), "Seiten")
