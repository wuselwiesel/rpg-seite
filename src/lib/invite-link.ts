// Weltnummer aus einem eingefügten Einladungslink („…/worlds/join/<id>“) oder einer nackten Nummer
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function parseInviteLink(text: string): string | null {
  const t = text.trim();
  const link = t.match(new RegExp(`/worlds/(?:join/)?(${UUID})(?:[/?#]|$)`, "i"));
  if (link) return link[1].toLowerCase();
  const bare = t.match(new RegExp(`^(${UUID})$`, "i"));
  return bare ? bare[1].toLowerCase() : null;
}
