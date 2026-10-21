// Rohe Benachrichtigungs-Typen (siehe type-Werte bei createNotification-Aufrufen und
// "message" beim Chat) zu Gruppen gebündelt, die man in den Einstellungen einzeln
// an-/ausschalten kann - ähnlich der Personalisierung bei Instagram. Eigene Datei ohne
// "server-only"-Import, damit sie auch aus Client-Komponenten importierbar ist.
export const NOTIFICATION_TYPE_GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: "like", label: "Gefällt mir", types: ["like", "story_like"] },
  { key: "comment", label: "Kommentare", types: ["comment"] },
  { key: "mention", label: "Erwähnungen", types: ["mention", "story_mention"] },
  { key: "message", label: "Chat-Nachrichten", types: ["message"] },
  { key: "turn", label: "Du bist dran (Story)", types: ["turn"] },
  { key: "new_scene", label: "Neue Szenen in deiner Welt", types: ["new_scene"] },
  { key: "roll", label: "Würfe gegen dich", types: ["roll"] },
  { key: "friend", label: "Freundschaftsanfragen und Begrüßungen", types: ["friend_request", "friend_accept", "welcome_greeting"] },
  { key: "relationship", label: "Beziehungen", types: ["relationship"] },
  { key: "badge", label: "Badges", types: ["badge"] },
  { key: "world_join", label: "Welt-Beitritt", types: ["world_request", "world_request_result", "world_invite", "world_invite_result"] },
  { key: "world_admin", label: "Welt-Verwaltung (als Admin)", types: ["world_admin_member", "world_admin_character", "world_admin_npc", "world_admin_leave", "world_admin_full", "world_admin_role"] },
  { key: "role", label: "Rollen (Angebote und Antworten)", types: ["character_offer", "character_claim_result"] },
  { key: "review", label: "Charaktere prüfen (Entscheidungen und Änderungsvorschläge)", types: ["character_review", "character_change"] },
  { key: "ticket", label: "Meldungen (Fehler, Wünsche, Fragen)", types: ["ticket_new", "ticket_comment", "ticket_status"] },
  { key: "redaktion", label: "Redaktion", types: ["redaktion_post", "redaktion_comment", "redaktion_reaction"] },
];
