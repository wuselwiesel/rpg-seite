// Wechselt man den aktiven Charakter, während man das Profil oder den ChaBo eines eigenen Charakters ansieht,
// soll danach die gleiche Seite des neuen Charakters erscheinen (nicht die des alten stehen bleiben).
// Gibt den neuen Pfad zurück oder null, wenn die Seite einfach neu geladen werden kann.
export function characterPathAfterSwitch(pathname: string | null, ownIds: string[], newId: string): string | null {
  const m = /^\/characters\/([^/]+)(\/chabo)?$/.exec(pathname ?? "");
  if (!m || !ownIds.includes(m[1])) return null;
  return `/characters/${newId}${m[2] ?? ""}`;
}
