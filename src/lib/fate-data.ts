// Die eigentliche Schicksalsdatenbank des Schicksalswürfels – bewusst getrennt von der
// Auswahl-Engine (fate-engine.ts) und der UI, damit hier jederzeit gefahrlos neue
// Einträge ergänzt werden können. Alle Schicksale sind mindestens "mittel", nie belanglos.
// Übernatürliches ist ausschließlich Vampiren und Werwölfen vorbehalten.
import type { Fate, FateCategory, FateRoleRequirement, FateSeverity } from "@/lib/fate-types";

// Schicksal ohne Zusatz-Charaktere.
function s(id: number, category: FateCategory, severity: FateSeverity, text: string, char1?: FateRoleRequirement): Fate {
  return { id, category, severity, minTargets: 0, maxTargets: 0, text, char1 };
}

// Schicksal mit genau einem möglichen Zusatz-Charakter (character2).
function t(
  id: number,
  category: FateCategory,
  severity: FateSeverity,
  text: string,
  opts: { optional?: boolean; soloText?: string; role?: FateRoleRequirement; char1?: FateRoleRequirement } = {},
): Fate {
  return {
    id,
    category,
    severity,
    minTargets: opts.optional ? 0 : 1,
    maxTargets: 1,
    text,
    soloText: opts.soloText,
    roles: [opts.role ?? {}],
    char1: opts.char1,
  };
}

// Schicksal mit zwei zwingenden Zusatz-Charakteren (character2 und character3).
function t2(
  id: number,
  category: FateCategory,
  severity: FateSeverity,
  text: string,
  opts: { role2?: FateRoleRequirement; role3?: FateRoleRequirement; char1?: FateRoleRequirement } = {},
): Fate {
  return {
    id,
    category,
    severity,
    minTargets: 2,
    maxTargets: 2,
    text,
    roles: [opts.role2 ?? {}, opts.role3 ?? {}],
    char1: opts.char1,
  };
}

const w = { gender: "maennlich" as const };
const f = { gender: "weiblich" as const };
const vamp: FateRoleRequirement = { species: ["vampir"] };
const wolf: FateRoleRequirement = { species: ["werwolf"] };

export const FATES: Fate[] = [
  // ---- Beziehung (1-28) ----
  t(1, "Beziehung", "schwer", "{character1} wird von {character2} betrogen."),
  t(2, "Beziehung", "mittel", "{character1} verliebt sich in {character2} – obwohl {character2} bereits vergeben ist."),
  t(3, "Beziehung", "schwer", "{character1} entdeckt, dass {character2} seit Monaten ein Geheimnis verschweigt."),
  t(4, "Beziehung", "schwer", "{character1} wird von {character2} verlassen – ohne Vorwarnung."),
  t(5, "Beziehung", "mittel", "{character1} beginnt eine heimliche Beziehung mit {character2}."),
  t2(6, "Beziehung", "schwer", "{character1} entdeckt eine Affäre zwischen {character2} und {character3}."),
  t(7, "Beziehung", "schwer", "{character1} wird von {character2} öffentlich bloßgestellt."),
  t(8, "Beziehung", "sehr schwer", "{character1} wird von {character2} erpresst – mit einem Geheimnis, das alles zerstören könnte."),
  s(9, "Beziehung", "mittel", "{character1} muss sich zwischen zwei Menschen entscheiden, die {character1} beide etwas bedeuten."),
  t(10, "Beziehung", "schwer", "{character1} entdeckt, dass die eigene Beziehung zu {character2} auf einer Lüge aufgebaut war."),
  t2(11, "Beziehung", "sehr schwer", "{character1} gerät zwischen {character2} und {character3} – beide kämpfen um {character1}."),
  t(12, "Beziehung", "mittel", "{character1} merkt, dass die Gefühle für {character2} plötzlich alles andere überschatten."),
  t(13, "Beziehung", "schwer", "{character1} wird von {character2} vor die Wahl gestellt: alles oder nichts."),
  s(14, "Beziehung", "mittel", "Ein lang gehütetes Gefühl bricht bei {character1} unkontrolliert hervor – mit Folgen, die sich nicht mehr verstecken lassen."),
  t(15, "Beziehung", "schwer", "{character1} findet heraus, dass {character2} eine zweite Beziehung führt."),
  t(16, "Beziehung", "sehr schwer", "{character1} wird von {character2} verraten – für jemand anderen."),
  s(17, "Beziehung", "schwer", "{character1} muss eine Beziehung beenden, die längst zu einer Last geworden ist."),
  t(18, "Beziehung", "mittel", "{character1} und {character2} geraten in einen Streit, der eine tiefere Kluft offenlegt."),
  t(19, "Beziehung", "schwer", "{character1} entdeckt private Nachrichten von {character2}, die alles infrage stellen."),
  t(20, "Beziehung", "sehr schwer", "{character1} wird von {character2} manipuliert – über Monate hinweg, ohne es zu bemerken."),
  s(21, "Beziehung", "mittel", "{character1} erkennt, dass eine wichtige Beziehung nur noch aus Gewohnheit besteht."),
  t(22, "Beziehung", "schwer", "{character1} muss sich entscheiden: die Wahrheit sagen und {character2} verlieren, oder weiter schweigen."),
  t(23, "Beziehung", "mittel", "{character1} bemerkt, dass {character2} sich in letzter Zeit auffällig distanziert."),
  t(24, "Beziehung", "schwer", "{character1} wird Zeuge, wie {character2} mit jemand anderem intim wird."),
  s(25, "Beziehung", "sehr schwer", "{character1} verliert durch eine einzige Entscheidung die wichtigste Beziehung im Leben."),
  t(26, "Beziehung", "schwer", "{character1} erhält ein Ultimatum von {character2}: Vertrauen zurückgewinnen oder alles verlieren."),
  t(27, "Beziehung", "mittel", "{character1} entdeckt, dass {character2} heimlich Kontakt zu einer alten Beziehung hält."),
  t2(28, "Beziehung", "schwer", "{character1} erfährt, dass sich {character2} und {character3} heimlich hinter dem Rücken von {character1} abgesprochen haben."),

  // ---- Familie / Schwangerschaft (29-46) ----
  t(29, "Familie", "sehr schwer", "{character1} wird schwanger von {character2}.", { optional: true, soloText: "{character1} wird schwanger.", role: w, char1: f }),
  t(30, "Familie", "sehr schwer", "{character1} erfährt, dass {character2} monatelang die eigene Schwangerschaft verheimlicht hat.", { role: f }),
  t(31, "Familie", "schwer", "{character1} erfährt, dass {character2} ein lange verborgenes Familienmitglied ist."),
  s(32, "Familie", "schwer", "{character1} entdeckt ein schwerwiegendes Geheimnis in der eigenen Familie."),
  t(33, "Familie", "sehr schwer", "{character1} erfährt, dass {character2} jahrelang über die eigene Herkunft gelogen hat."),
  s(34, "Familie", "schwer", "{character1} wird von der eigenen Familie verstoßen."),
  t(35, "Familie", "sehr schwer", "{character1} erfährt, dass {character2} in Wahrheit ein leiblicher Elternteil ist."),
  s(36, "Familie", "mittel", "Ein alter Familienkonflikt bricht bei {character1} unerwartet wieder auf."),
  t(37, "Familie", "schwer", "{character1} entdeckt, dass {character2} ein Kind hat, von dem niemand wusste."),
  s(38, "Familie", "sehr schwer", "{character1} verliert durch einen tragischen Vorfall ein Mitglied der eigenen Familie."),
  t(39, "Familie", "schwer", "{character1} wird von {character2} vor eine Entscheidung gestellt, die die ganze Familie betrifft."),
  s(40, "Familie", "mittel", "{character1} erfährt, dass ein Erbe an unerwartete Bedingungen geknüpft ist."),
  t(41, "Familie", "sehr schwer", "{character1} erfährt, dass {character2} nicht der leibliche Elternteil ist, für den {character2} sich all die Jahre ausgegeben hat."),
  s(42, "Familie", "schwer", "{character1} muss sich entscheiden, ob ein dunkles Familiengeheimnis ans Licht kommen darf."),
  t(43, "Familie", "mittel", "{character1} und {character2} entdecken, dass sie enger verwandt sind, als beide dachten."),
  s(44, "Familie", "sehr schwer", "{character1} wird für ein Verbrechen verantwortlich gemacht, das jemand in der eigenen Familie begangen hat."),
  t(45, "Familie", "schwer", "{character1} erfährt, dass {character2} für das Zerbrechen der eigenen Familie verantwortlich ist."),
  s(46, "Familie", "schwer", "{character1} steht vor der Entscheidung, ein Familienmitglied für immer aus dem eigenen Leben zu streichen."),

  // ---- Gefahr (47-74) ----
  t(47, "Gefahr", "sehr schwer", "{character1} wird von {character2} entführt.", { optional: true, soloText: "{character1} wird entführt." }),
  t(48, "Gefahr", "sehr schwer", "{character1} wird von {character2} verfolgt.", { optional: true, soloText: "{character1} wird verfolgt." }),
  t(49, "Gefahr", "schwer", "{character1} wird von {character2} überfallen.", { optional: true, soloText: "{character1} wird überfallen." }),
  t(50, "Gefahr", "sehr schwer", "{character1} wird von {character2} erpresst.", { optional: true, soloText: "{character1} wird erpresst." }),
  t(51, "Gefahr", "schwer", "{character1} wird von {character2} bedroht.", { optional: true, soloText: "{character1} wird bedroht." }),
  s(52, "Gefahr", "sehr schwer", "{character1} gerät in eine lebensgefährliche Situation."),
  t(53, "Gefahr", "sehr schwer", "{character1} wird von {character2} bei einem Autounfall schwer verletzt.", { optional: true, soloText: "{character1} wird bei einem Autounfall schwer verletzt." }),
  s(54, "Gefahr", "sehr schwer", "{character1} wird angeschossen."),
  s(55, "Gefahr", "sehr schwer", "{character1} wird niedergestochen."),
  t(56, "Gefahr", "sehr schwer", "{character1} und {character2} haben gemeinsam einen schweren Autounfall.", { optional: true, soloText: "{character1} hat einen schweren Autounfall." }),
  s(57, "Gefahr", "schwer", "{character1} wird Opfer eines Einbruchs, der alles verändert."),
  t(58, "Gefahr", "sehr schwer", "{character1} wird von {character2} als Druckmittel benutzt, um an jemand anderen heranzukommen."),
  s(59, "Gefahr", "schwer", "{character1} gerät in einen Hinterhalt, den niemand kommen sah."),
  s(60, "Gefahr", "sehr schwer", "{character1} wird bei einem Brand schwer verletzt."),
  t(61, "Gefahr", "sehr schwer", "{character1} wird von {character2} absichtlich in Lebensgefahr gebracht."),
  s(62, "Gefahr", "schwer", "{character1} stürzt aus großer Höhe und trägt schwere Verletzungen davon."),
  s(63, "Gefahr", "sehr schwer", "{character1} wird vergiftet."),
  t2(64, "Gefahr", "sehr schwer", "{character1} wird als Geisel genommen, um {character2} zum Handeln zu zwingen – {character3} steht hilflos daneben."),
  s(65, "Gefahr", "schwer", "{character1} überlebt nur knapp einen gezielten Anschlag."),
  t(66, "Gefahr", "sehr schwer", "{character1} wird von {character2} aus einer brennenden Gefahr gerettet – um den Preis eines großen Geheimnisses."),
  s(67, "Gefahr", "schwer", "{character1} wird bei einer Explosion verletzt."),
  t2(68, "Gefahr", "sehr schwer", "{character1} muss sich entscheiden, wen von beiden – {character2} oder {character3} – man zuerst aus der Gefahr rettet."),
  s(69, "Gefahr", "schwer", "{character1} wird in ein gefährliches Gebiet gelockt, ohne die wahren Absichten dahinter zu kennen."),
  t(70, "Gefahr", "sehr schwer", "{character1} wird von {character2} in eine Falle gelockt."),
  s(71, "Gefahr", "schwer", "{character1} entkommt nur knapp einem Entführungsversuch."),
  s(72, "Gefahr", "sehr schwer", "{character1} wird schwer misshandelt und muss sich langsam zurückkämpfen."),
  t(73, "Gefahr", "schwer", "{character1} wird von {character2} in einen gefährlichen Plan hineingezogen, ohne vorher gefragt zu werden."),
  s(74, "Gefahr", "sehr schwer", "{character1} überlebt einen Mordanschlag nur knapp."),

  // ---- Kriminalität (75-92) ----
  s(75, "Kriminalität", "sehr schwer", "{character1} wird eines schweren Verbrechens beschuldigt, das man nicht begangen hat."),
  s(76, "Kriminalität", "schwer", "{character1} wird verhaftet."),
  t(77, "Kriminalität", "sehr schwer", "{character1} wird von {character2} erpresst, um ein Verbrechen zu vertuschen."),
  s(78, "Kriminalität", "schwer", "{character1} wird Zeuge eines schweren Verbrechens."),
  t(79, "Kriminalität", "sehr schwer", "{character1} wird von {character2} in ein Verbrechen hineingezogen."),
  t(80, "Kriminalität", "sehr schwer", "{character1} wird von {character2} verraten – an die Polizei."),
  s(81, "Kriminalität", "schwer", "{character1} findet Beweise für ein Verbrechen, das jemand aus dem engsten Umfeld begangen hat."),
  t(82, "Kriminalität", "sehr schwer", "{character1} deckt auf, dass {character2} in ein Netzwerk organisierter Kriminalität verstrickt ist."),
  s(83, "Kriminalität", "schwer", "{character1} wird für ein Verbrechen, das man nicht begangen hat, öffentlich verdächtigt."),
  t(84, "Kriminalität", "sehr schwer", "{character1} wird von {character2} gezwungen, über ein Verbrechen zu schweigen."),
  s(85, "Kriminalität", "schwer", "{character1} gerät ins Visier einer Ermittlung."),
  t2(86, "Kriminalität", "sehr schwer", "{character1} entdeckt, dass {character2} und {character3} gemeinsam ein schweres Verbrechen begangen haben."),
  s(87, "Kriminalität", "sehr schwer", "{character1} wird entführt und als Druckmittel für ein Lösegeld benutzt."),
  t(88, "Kriminalität", "schwer", "{character1} wird von {character2} bestohlen – um etwas, das nicht zu ersetzen ist."),
  s(89, "Kriminalität", "sehr schwer", "{character1} gerät zwischen die Fronten einer kriminellen Auseinandersetzung."),
  t(90, "Kriminalität", "sehr schwer", "{character1} wird von {character2} gezwungen, bei einem Verbrechen mitzumachen."),
  s(91, "Kriminalität", "schwer", "{character1} wird Opfer eines gezielten Betrugs, der alles Ersparte kostet."),
  t(92, "Kriminalität", "sehr schwer", "{character1} findet heraus, dass {character2} seit Jahren ein Doppelleben als Kriminelle:r führt."),

  // ---- Vergangenheit / Geheimnisse (93-110) ----
  s(93, "Vergangenheit", "schwer", "Ein schweres Geheimnis von {character1} kommt ans Licht."),
  t(94, "Vergangenheit", "schwer", "{character1} wird mit einer Person aus der eigenen Vergangenheit konfrontiert: {character2}."),
  s(95, "Vergangenheit", "sehr schwer", "{character1} erfährt eine schockierende Wahrheit über die eigene Herkunft."),
  t(96, "Vergangenheit", "schwer", "{character1} entdeckt, dass {character2} seit langer Zeit lügt."),
  s(97, "Vergangenheit", "schwer", "{character1} wird mit einer folgenschweren Entscheidung aus der eigenen Vergangenheit konfrontiert."),
  t(98, "Vergangenheit", "sehr schwer", "{character1} entdeckt, dass {character2} ein dunkles Geheimnis über die eigene Person kennt."),
  s(99, "Vergangenheit", "schwer", "Eine alte Wunde bei {character1} bricht durch einen Zufall wieder auf."),
  t(100, "Vergangenheit", "sehr schwer", "{character1} erfährt, dass {character2} eine entscheidende Rolle in einem alten Trauma gespielt hat."),
  s(101, "Vergangenheit", "mittel", "{character1} muss sich einer Entscheidung stellen, die jahrelang verdrängt wurde."),
  t(102, "Vergangenheit", "schwer", "{character1} entdeckt Beweise dafür, dass {character2} nie die Wahrheit über die gemeinsame Geschichte gesagt hat."),
  s(103, "Vergangenheit", "sehr schwer", "{character1} erkennt, dass ein zentrales Erinnerungsstück der eigenen Vergangenheit eine Lüge war."),
  t(104, "Vergangenheit", "schwer", "{character1} wird von {character2} mit einem Versprechen aus der Vergangenheit konfrontiert, das nie eingelöst wurde."),
  s(105, "Vergangenheit", "sehr schwer", "{character1} erfährt, dass ein einschneidendes Ereignis der eigenen Kindheit ganz anders ablief als erinnert."),
  t(106, "Vergangenheit", "sehr schwer", "{character1} entdeckt, dass {character2} für ein einschneidendes Unglück in der eigenen Vergangenheit verantwortlich ist."),
  s(107, "Vergangenheit", "schwer", "{character1} muss sich einer Person aus der Vergangenheit stellen, die man für immer verloren glaubte."),
  t(108, "Vergangenheit", "sehr schwer", "{character1} erfährt von {character2}, dass die eigene Identität nicht die ist, für die man sie hielt."),
  s(109, "Vergangenheit", "schwer", "{character1} erhält einen Brief aus der Vergangenheit, der alles infrage stellt."),
  t(110, "Vergangenheit", "sehr schwer", "{character1} entdeckt, dass {character2} seit Jahren Teil eines Geheimnisses ist, das die eigene Vergangenheit betrifft."),

  // ---- Vampir (111-130) ----
  s(111, "Vampir", "sehr schwer", "{character1} wird von einem Vampir gebissen."),
  t(112, "Vampir", "sehr schwer", "{character1} wird von {character2}, einem Vampir, gebissen.", { role: vamp }),
  s(113, "Vampir", "sehr schwer", "{character1} wird von einem Vampir entführt."),
  s(114, "Vampir", "sehr schwer", "{character1} wird gegen den eigenen Willen in einen Vampir verwandelt."),
  t(115, "Vampir", "sehr schwer", "{character1} entdeckt, dass {character2} in Wahrheit ein Vampir ist.", { role: vamp }),
  s(116, "Vampir", "sehr schwer", "{character1} wird zum Ziel eines Vampirs, der es auf mehr als nur Blut abgesehen hat."),
  t2(117, "Vampir", "sehr schwer", "{character1} gerät zwischen zwei rivalisierende Vampire: {character2} und {character3}.", { role2: vamp, role3: vamp }),
  s(118, "Vampir", "sehr schwer", "{character1} wird bei einem Angriff eines Vampirs schwer verletzt."),
  t(119, "Vampir", "sehr schwer", "{character1} wird von {character2} vor einem Vampirangriff gerettet – um einen hohen Preis."),
  s(120, "Vampir", "sehr schwer", "{character1} findet Spuren eines Vampirangriffs in der eigenen Nachbarschaft."),
  t(121, "Vampir", "sehr schwer", "{character1} wird von {character2} vor eine Wahl gestellt: sich dem Ruf des Vampirblutes zu ergeben oder dagegen anzukämpfen.", { role: vamp }),
  s(122, "Vampir", "schwer", "{character1} spürt zum ersten Mal die Folgen eines lange zurückliegenden Vampirbisses."),
  t(123, "Vampir", "sehr schwer", "{character1} wird von {character2} als Vampir enttarnt – vor allen.", { role: vamp }),
  s(124, "Vampir", "sehr schwer", "{character1} wird nachts von einem Vampir verfolgt."),
  t(125, "Vampir", "sehr schwer", "{character1} erfährt, dass {character2} seit Jahren ein Vampirdasein verheimlicht.", { role: vamp }),
  s(126, "Vampir", "sehr schwer", "{character1} wird in einen Konflikt zwischen verfeindeten Vampirclans hineingezogen."),
  t(127, "Vampir", "sehr schwer", "{character1} wird von {character2} gebissen und muss nun mit den ersten Anzeichen der Verwandlung leben.", { role: vamp, char1: { species: ["mensch"] } }),
  s(128, "Vampir", "sehr schwer", "{character1} wird Ziel eines Vampirs, der eine alte Rechnung begleichen will."),
  t(129, "Vampir", "sehr schwer", "{character1} muss sich entscheiden, ob {character2} nach der Verwandlung in einen Vampir noch vertraut werden kann.", { role: vamp }),
  s(130, "Vampir", "sehr schwer", "{character1} wird nach einem nächtlichen Angriff mit ersten Symptomen einer Vampirverwandlung konfrontiert."),

  // ---- Werwolf (131-150) ----
  s(131, "Werwolf", "sehr schwer", "{character1} wird von einem Werwolf gebissen."),
  t(132, "Werwolf", "sehr schwer", "{character1} wird von {character2}, einem Werwolf, gebissen.", { role: wolf }),
  s(133, "Werwolf", "sehr schwer", "{character1} wird von einem Werwolf angegriffen."),
  s(134, "Werwolf", "sehr schwer", "{character1} verwandelt sich zum ersten Mal in einen Werwolf."),
  t(135, "Werwolf", "sehr schwer", "{character1} entdeckt, dass {character2} in Wahrheit ein Werwolf ist.", { role: wolf }),
  s(136, "Werwolf", "sehr schwer", "{character1} wird von einem Werwolf verfolgt."),
  t2(137, "Werwolf", "sehr schwer", "{character1} gerät zwischen zwei verfeindete Werwölfe: {character2} und {character3}.", { role2: wolf, role3: wolf }),
  s(138, "Werwolf", "sehr schwer", "{character1} wird bei einem Werwolfangriff schwer verletzt."),
  t(139, "Werwolf", "sehr schwer", "{character1} wird von {character2} vor einem Werwolfangriff gerettet – um einen hohen Preis."),
  s(140, "Werwolf", "sehr schwer", "{character1} findet Spuren eines Werwolfangriffs in der Nähe des eigenen Zuhauses."),
  t(141, "Werwolf", "sehr schwer", "{character1} wird von {character2} vor eine Wahl gestellt: das Rudel oder die eigene Menschlichkeit.", { role: wolf }),
  s(142, "Werwolf", "schwer", "{character1} spürt zum ersten Mal die Folgen eines lange zurückliegenden Werwolfbisses."),
  t(143, "Werwolf", "sehr schwer", "{character1} wird von {character2} als Werwolf enttarnt – vor allen.", { role: wolf }),
  s(144, "Werwolf", "sehr schwer", "{character1} wird bei Vollmond von einem Werwolf gejagt."),
  t(145, "Werwolf", "sehr schwer", "{character1} erfährt, dass {character2} seit Jahren ein Werwolfdasein verheimlicht.", { role: wolf }),
  s(146, "Werwolf", "sehr schwer", "{character1} wird in einen Konflikt zwischen verfeindeten Rudeln hineingezogen."),
  t(147, "Werwolf", "sehr schwer", "{character1} wird von {character2} gebissen und muss nun mit den ersten Anzeichen der Verwandlung leben.", { role: wolf, char1: { species: ["mensch"] } }),
  s(148, "Werwolf", "sehr schwer", "{character1} wird Ziel eines Werwolfs, der eine alte Rechnung begleichen will."),
  t(149, "Werwolf", "sehr schwer", "{character1} muss sich entscheiden, ob {character2} nach der ersten Verwandlung noch vertraut werden kann.", { role: wolf }),
  s(150, "Werwolf", "sehr schwer", "{character1} wird nach einem nächtlichen Vorfall mit den ersten Symptomen einer Werwolfverwandlung konfrontiert."),
];
