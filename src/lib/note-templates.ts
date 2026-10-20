// Mitgelieferte Vorlagen für Notizen (nur im Code, nicht in der Datenbank; „Übernehmen“ legt eine eigene Kopie an)
export type BuiltinTemplate = { id: string; title: string; body: string; tags: string[] };

const task = (text: string) =>
  `<li data-type="taskItem" data-checked="false"><label><input type="checkbox" disabled="disabled" /><span></span></label><div><p>${text}</p></div></li>`;

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "plot-idee",
    title: "Plot-Idee",
    tags: ["plot"],
    body: "<h2>Idee</h2><p></p><h2>Wer ist beteiligt?</h2><p></p><h2>Wie könnte es weitergehen?</h2><ul><li><p></p></li></ul><h2>Offene Fragen</h2>" + `<ul data-type="taskList">${task("")}</ul>`,
  },
  {
    id: "szenenplan",
    title: "Szenenplan",
    tags: ["szene"],
    body: "<h2>Ort und Zeit</h2><p></p><h2>Beteiligte</h2><p></p><h2>Ablauf</h2><ol><li><p></p></li></ol><h2>Wichtig</h2>" + `<ul data-type="taskList">${task("")}</ul>`,
  },
  {
    id: "charakter-notizen",
    title: "Charakter-Notizen",
    tags: ["charakter"],
    body: "<h2>Eindruck</h2><p></p><h2>Beziehungen</h2><table><tbody><tr><th>Wer</th><th>Verhältnis</th><th>Offen</th></tr><tr><td></td><td></td><td></td></tr></tbody></table><h2>Ziele</h2><ul><li><p></p></li></ul><h2>Geheimnisse</h2><p></p>",
  },
];

// Alle Haken zurücksetzen, damit aus einer Vorlage eine frische Notiz wird
export function uncheckTasks(html: string): string {
  return html.replace(/data-checked="true"/g, 'data-checked="false"').replace(/(<input\b[^>]*?)\s+checked(="[^"]*")?/g, "$1");
}
