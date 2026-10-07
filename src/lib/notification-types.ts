// Rohe Benachrichtigungs-Typen (siehe type-Werte bei createNotification-Aufrufen und
// "message" beim Chat) zu Gruppen gebündelt, die man in den Einstellungen einzeln
// an-/ausschalten kann - ähnlich der Personalisierung bei Instagram. Eigene Datei ohne
// "server-only"-Import, damit sie auch aus Client-Komponenten importierbar ist.
export const NOTIFICATION_TYPE_GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: "like", label: "Gefällt mir", types: ["like", "story_like"] },
  { key: "comment", label: "Kommentare", types: ["comment"] },
  { key: "mention", label: "Erwähnungen", types: ["mention"] },
  { key: "message", label: "Chat-Nachrichten", types: ["message"] },
  { key: "turn", label: "Du bist dran (Story)", types: ["turn"] },
  { key: "new_scene", label: "Neue Szenen in deiner Welt", types: ["new_scene"] },
  { key: "roll", label: "Würfe gegen dich", types: ["roll"] },
  { key: "friend", label: "Freundschaftsanfragen", types: ["friend_request", "friend_accept"] },
  { key: "badge", label: "Badges", types: ["badge"] },
  { key: "redaktion", label: "Redaktion", types: ["redaktion_post", "redaktion_comment", "redaktion_reaction"] },
];
