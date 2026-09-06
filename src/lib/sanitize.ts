import "server-only";
import DOMPurify from "isomorphic-dompurify";

export function sanitizePostHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt"],
  });
}
