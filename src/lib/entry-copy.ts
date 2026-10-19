import { visibleEntryElement } from "@/lib/scene-quote";

// Text einer oder mehrerer Nachrichten der Szene aus der Seite lesen und in die Zwischenablage legen.
// Mehrere Nachrichten stehen untereinander, jeweils mit dem Namen der Figur davor.
export function entriesText(ids: string[], withNames: boolean): string {
  const parts: string[] = [];
  for (const id of ids) {
    const el = visibleEntryElement(id);
    if (!el) continue;
    const body = Array.from(el.querySelectorAll<HTMLElement>(".post-content"))
      .map((c) => c.innerText.trim())
      .filter(Boolean)
      .join("\n");
    if (!body) continue;
    const name = el.dataset.author?.trim();
    parts.push(withNames && name ? `${name}:\n${body}` : body);
  }
  return parts.join("\n\n");
}

export async function copyEntries(ids: string[], withNames: boolean): Promise<boolean> {
  const text = entriesText(ids, withNames);
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Ältere Browser ohne Zugriff auf die Zwischenablage: über ein verstecktes Feld kopieren
    const area = document.createElement("textarea");
    area.value = text;
    area.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}
