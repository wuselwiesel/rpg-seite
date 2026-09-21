import { MENTION_REGEX } from "@/lib/mentions";

type PreviewMessage = {
  content: string;
  image_url?: string | null;
  shared_post_id?: string | null;
  story_id?: string | null;
};

// Kurzer Vorschautext für die Chatliste: Erwähnungen als @Name, Anhänge als Stichwort.
export function messagePreview(m: PreviewMessage): string {
  const text = m.content.replace(MENTION_REGEX, "@$1").replace(/\s+/g, " ").trim();
  if (text) return text;
  if (m.image_url) return /\.gif(\?|$)|giphy|tenor/i.test(m.image_url) ? "GIF" : "Foto";
  if (m.shared_post_id) return "Beitrag geteilt";
  if (m.story_id) return "Story geteilt";
  return "Nachricht";
}

// Chatliste: heute = Uhrzeit, gestern = "Gestern", diese Woche = Wochentag, sonst Datum.
export function chatTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (days <= 0) return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Gestern";
  if (days < 7) return d.toLocaleDateString("de-DE", { weekday: "short" });
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}
