// Systemzeile im Chat („X wurde hinzugefügt“): eine normale Nachricht mit unsichtbarem Präfix,
// angezeigt als zentrierte Zeile ohne Absender.
const PREFIX = "⁣⁣";

export function systemMessageText(text: string): string {
  return `${PREFIX}${text}`;
}

export function parseSystemMessage(content: string): string | null {
  return content.startsWith(PREFIX) ? content.slice(PREFIX.length).trim() : null;
}
