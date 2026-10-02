export type BadgeKind = "auto" | "account" | "custom";

export type AutoBadgeDef = {
  key: string; // z. B. "auto:first_post" bzw. "account:red_first"
  scope: "character" | "account";
  name: string;
  description: string;
  icon: string;
  color: string;
  metric: "posts" | "comments" | "story" | "followers" | "likes" | "red_posts" | "red_polls" | "red_comments" | "red_reactions";
  threshold: number;
};

export const AUTO_BADGES: AutoBadgeDef[] = [
  { key: "auto:first_post", scope: "character", name: "Erster Beitrag", description: "Den ersten Beitrag veröffentlicht.", icon: "📝", color: "#6b8e5a", metric: "posts", threshold: 1 },
  { key: "auto:posts_10", scope: "character", name: "Vielschreiber:in", description: "10 Beiträge veröffentlicht.", icon: "✍️", color: "#5a7fa8", metric: "posts", threshold: 10 },
  { key: "auto:posts_50", scope: "character", name: "Chronist:in", description: "50 Beiträge veröffentlicht.", icon: "📚", color: "#8a5a9e", metric: "posts", threshold: 50 },
  { key: "auto:likes_25", scope: "character", name: "Beliebt", description: "25 Herzen auf Beiträge erhalten.", icon: "❤️", color: "#d0506a", metric: "likes", threshold: 25 },
  { key: "auto:likes_100", scope: "character", name: "Publikumsliebling", description: "100 Herzen auf Beiträge erhalten.", icon: "🌟", color: "#d4a017", metric: "likes", threshold: 100 },
  { key: "auto:comments_25", scope: "character", name: "Gesprächig", description: "25 Kommentare geschrieben.", icon: "💬", color: "#3f9aa3", metric: "comments", threshold: 25 },
  { key: "auto:story_10", scope: "character", name: "Geschichtenerzähler:in", description: "10 Einträge in Story-Szenen geschrieben.", icon: "📖", color: "#a8643b", metric: "story", threshold: 10 },
  { key: "auto:story_50", scope: "character", name: "Legende der Story", description: "50 Einträge in Story-Szenen geschrieben.", icon: "🏰", color: "#7a5a3b", metric: "story", threshold: 50 },
  { key: "auto:followers_10", scope: "character", name: "Im Gespräch", description: "10 Follower gewonnen.", icon: "👥", color: "#4a6fb0", metric: "followers", threshold: 10 },
  { key: "account:red_first", scope: "account", name: "Erste Redaktion", description: "Den ersten Redaktions-Beitrag veröffentlicht.", icon: "📰", color: "#b3261e", metric: "red_posts", threshold: 1 },
  { key: "account:red_posts_10", scope: "account", name: "Stammgast", description: "10 Redaktions-Beiträge veröffentlicht.", icon: "☕", color: "#7a4a2a", metric: "red_posts", threshold: 10 },
  { key: "account:red_poll", scope: "account", name: "Meinungsmacher:in", description: "Die erste Umfrage gestartet.", icon: "📊", color: "#2f6f8f", metric: "red_polls", threshold: 1 },
  { key: "account:red_comments_25", scope: "account", name: "Diskutierfreudig", description: "25 Redaktions-Kommentare geschrieben.", icon: "🗣️", color: "#6b5aa8", metric: "red_comments", threshold: 25 },
  { key: "account:red_reactions_25", scope: "account", name: "Gern gesehen", description: "25 Reaktionen auf Redaktions-Beiträge erhalten.", icon: "🎉", color: "#c27a1a", metric: "red_reactions", threshold: 25 },
];

export function autoBadgeByKey(key: string): AutoBadgeDef | undefined {
  return AUTO_BADGES.find((b) => b.key === key);
}

// Ein vergebenes Badge, fertig zur Anzeige.
export type BadgeView = {
  awardId: string;
  key: string;
  kind: BadgeKind;
  name: string;
  description: string;
  icon: string;
  color: string;
  awardedAt: string;
  awardedByName?: string | null;
  defId?: string | null;
};

export const BADGE_PROFILE_KEY = "wortwinkel:badges-profile";
export const BADGE_NAMES_KEY = "wortwinkel:badges-names";
export const BADGE_PREF_EVENT = "wortwinkel:badge-pref-change";
