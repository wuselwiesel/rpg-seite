import "server-only";
import { sanitizePostHtmlCore } from "@/lib/sanitize-core";

export function sanitizePostHtml(html: string): string {
  return sanitizePostHtmlCore(html);
}
