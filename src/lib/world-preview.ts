import { sanitizePostHtml } from "@/lib/sanitize";

// Vorschau einer fremden Welt: Wiki-Verweise [[Titel|Text]] werden zu einfachem Text, der Rest wie überall bereinigt.
export function previewHtml(content: string): string {
  const plain = content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, "$1");
  return sanitizePostHtml(plain);
}

export type WorldPreviewInfo = {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  welcome_html: string | null;
  preview: "none" | "info" | "full";
  join_mode: "open" | "request" | "invite";
  created_by: string;
  is_member: boolean;
  has_request: boolean;
  member_count: number;
};
