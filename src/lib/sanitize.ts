import "server-only";
import sanitizeHtml from "sanitize-html";

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
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
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      span: ["data-type", "data-id", "class", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Nur font-family erlaubt, und nur mit einem Wert, der wie eine unserer generierten
    // Schriftstapel aussieht (siehe PROFILE_FONTS) - verhindert CSS-Injection über das
    // Inline-Style-Attribut, das die Wort-/Buchstaben-genaue Schriftwahl in Posts braucht.
    allowedStyles: {
      span: {
        "font-family": [/^var\(--font-[a-z-]+\)(,\s*[a-zA-Z0-9 '"-]+)*$/],
      },
    },
  });
}
