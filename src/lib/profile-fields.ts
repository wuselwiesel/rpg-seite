export type ProfileField = { icon: string; title: string; text: string };

export const MAX_PROFILE_FIELDS = 12;

const CUSTOM_EMOJI_TOKEN = /^:[a-z0-9_]{2,32}:$/;

// Ein Symbol ist entweder ein eigenes Emoji (:name:) oder höchstens zwei Zeichen (ein normales Emoji bzw. Symbol).
export function cleanFieldIcon(raw: string): string {
  const t = raw.trim();
  return CUSTOM_EMOJI_TOKEN.test(t) ? t : Array.from(t).slice(0, 2).join("");
}

// Liest die eigenen Profilfelder (field_icon / field_title / field_text) aus dem Formular; unvollständige fallen weg.
export function parseProfileFields(formData: FormData): ProfileField[] {
  const icons = formData.getAll("field_icon").map(String);
  const titles = formData.getAll("field_title").map(String);
  const texts = formData.getAll("field_text").map(String);
  return titles
    .map((title, i) => ({
      icon: cleanFieldIcon(icons[i] ?? ""),
      title: title.trim().slice(0, 40),
      text: (texts[i] ?? "").trim().slice(0, 300),
    }))
    .filter((f) => f.title && f.text)
    .slice(0, MAX_PROFILE_FIELDS);
}
