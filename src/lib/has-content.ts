// Steht im Editor-HTML etwas (Text oder Bild)? Ein leerer Editor liefert „<p></p>“, das zählt nicht.
export function hasContent(html: string): boolean {
  return html.includes("<img") || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";
}
