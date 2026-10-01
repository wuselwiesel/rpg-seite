export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

// Kehrt die Umwandlung einer Bildunterschrift in HTML um (siehe createPost: `<p>${escapeHtml(text)
// .replace(/\n/g, "<br>")}</p>`), damit sie zum Bearbeiten wieder als Klartext in ein <textarea> passt.
export function htmlCaptionToPlainText(html: string): string {
  return html
    .replace(/^<p>|<\/p>$/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
