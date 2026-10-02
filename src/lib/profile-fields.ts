export type ProfileField = { icon: string; title: string; text: string };

export const MAX_PROFILE_FIELDS = 12;

// Liest die eigenen Profilfelder (field_icon / field_title / field_text) aus dem Formular; unvollständige fallen weg.
export function parseProfileFields(formData: FormData): ProfileField[] {
  const icons = formData.getAll("field_icon").map(String);
  const titles = formData.getAll("field_title").map(String);
  const texts = formData.getAll("field_text").map(String);
  return titles
    .map((title, i) => ({
      icon: Array.from((icons[i] ?? "").trim()).slice(0, 2).join(""),
      title: title.trim().slice(0, 40),
      text: (texts[i] ?? "").trim().slice(0, 300),
    }))
    .filter((f) => f.title && f.text)
    .slice(0, MAX_PROFILE_FIELDS);
}
