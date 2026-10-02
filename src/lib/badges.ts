export type BadgeKind = "auto" | "account" | "custom";

export type BadgeMetric =
  | "posts"
  | "media_posts"
  | "comments"
  | "story"
  | "rolls"
  | "rolls_won"
  | "messages"
  | "followers"
  | "following"
  | "likes"
  | "reactions"
  | "likes_given"
  | "relationships"
  | "stories"
  | "days"
  | "profile"
  | "red_posts"
  | "red_polls"
  | "red_comments"
  | "red_reactions"
  | "red_reactions_given"
  | "red_votes"
  | "friends"
  | "characters"
  | "wiki"
  | "badge_defs"
  | "acc_days";

export type BadgeTier = "bronze" | "silber" | "gold" | "legendaer";

export type AutoBadgeDef = {
  key: string; // z. B. "auto:first_post" bzw. "account:red_first"
  scope: "character" | "account";
  category: string;
  name: string;
  description: string; // so erreichst du es
  meaning: string; // was es bedeutet
  icon: string;
  color: string;
  metric: BadgeMetric;
  threshold: number;
  tier: BadgeTier;
};

export const TIER_LABEL: Record<BadgeTier, string> = {
  bronze: "Bronze",
  silber: "Silber",
  gold: "Gold",
  legendaer: "Legendär",
};

export const CHARACTER_CATEGORIES = [
  "Beiträge",
  "Beliebtheit",
  "Unterhaltung",
  "Story & Würfel",
  "Gemeinschaft",
  "Treue & Profil",
] as const;
export const ACCOUNT_CATEGORIES = ["Redaktion", "Gemeinschaft", "Welten & Werkzeuge", "Treue"] as const;

type Row = [key: string, name: string, icon: string, threshold: number, meaning: string, color?: string, tier?: BadgeTier];

function tierFor(index: number, total: number): BadgeTier {
  if (total <= 1) return "bronze";
  const r = index / (total - 1);
  if (r >= 1) return "legendaer";
  if (r >= 0.6) return "gold";
  if (r >= 0.3) return "silber";
  return "bronze";
}

const TIER_COLOR: Record<BadgeTier, string> = {
  bronze: "#a8643b",
  silber: "#7d8c9c",
  gold: "#d4a017",
  legendaer: "#8a4fc7",
};

function ladder(
  scope: "character" | "account",
  prefix: string,
  category: string,
  metric: BadgeMetric,
  how: (n: number) => string,
  rows: Row[],
): AutoBadgeDef[] {
  return rows.map(([key, name, icon, threshold, meaning, color, tierOverride], i) => {
    const tier = tierOverride ?? tierFor(i, rows.length);
    return {
      key: `${prefix}:${key}`,
      scope,
      category,
      name,
      description: how(threshold),
      meaning,
      icon,
      color: color ?? TIER_COLOR[tier],
      metric,
      threshold,
      tier,
    };
  });
}

const C = (...a: [string, BadgeMetric, (n: number) => string, Row[]][]) =>
  a.flatMap(([cat, metric, how, rows]) => ladder("character", "auto", cat, metric, how, rows));
const A = (...a: [string, BadgeMetric, (n: number) => string, Row[]][]) =>
  a.flatMap(([cat, metric, how, rows]) => ladder("account", "account", cat, metric, how, rows));

// Badges sind bewusst selten: es gibt keine "Erstes Mal"-Abzeichen, die man in der ersten Minute bekommt. Die
// niedrigste Stufe verlangt echte Aktivität, die höchsten sind Langzeit-Ziele. Schlüssel nennen die Schwelle
// (z. B. posts_50); wer die Schwelle ändert, benennt den Schlüssel mit um und räumt alte Vergaben per Migration auf.
export const AUTO_BADGES: AutoBadgeDef[] = [
  ...C(
    [
      "Beiträge",
      "posts",
      (n) => `${n} Beiträge im Feed veröffentlichen.`,
      [
        ["posts_10", "Vielschreiber:in", "✍️", 10, "Wer so oft schreibt, hat viel zu erzählen."],
        ["posts_50", "Chronist:in", "📚", 50, "Das Leben dieser Figur ist gut dokumentiert."],
        ["posts_150", "Archivar:in", "🏛️", 150, "Ein ganzes Archiv an Erinnerungen."],
        ["posts_500", "Unerschöpflich", "♾️", 500, "Die Ideen scheinen nie auszugehen."],
      ],
    ],
    [
      "Beiträge",
      "media_posts",
      (n) => `${n} Beiträge mit Bild oder Video veröffentlichen.`,
      [
        ["media_10", "Bildermacher:in", "🖼️", 10, "Die Welt bekommt Gesichter und Orte."],
        ["media_50", "Galerist:in", "🎞️", 50, "Eine eigene Ausstellung voller Momente."],
        ["media_150", "Kurator:in", "🏺", 150, "Dein Bildarchiv ist ein Schatz der Welt."],
      ],
    ],
    [
      "Beliebtheit",
      "likes",
      (n) => `${n} Herzen auf deine Beiträge bekommen.`,
      [
        ["likes_50", "Beliebt", "❤️", 50, "Deine Beiträge kommen an."],
        ["likes_250", "Publikumsliebling", "🌟", 250, "Der Feed wartet schon auf den nächsten Beitrag."],
        ["likes_1000", "Herzensbrecher:in", "💎", 1000, "Eine Legende unter den Lieblingsfiguren."],
      ],
    ],
    [
      "Beliebtheit",
      "reactions",
      (n) => `${n} Emoji-Reaktionen auf deine Beiträge bekommen.`,
      [
        ["react_100", "Echo", "🔔", 100, "Deine Worte hallen nach."],
        ["react_500", "Gefeierte Stimme", "📣", 500, "Eine Stimme, die man gern hört."],
      ],
    ],
    [
      "Unterhaltung",
      "comments",
      (n) => `${n} Kommentare unter Beiträgen schreiben.`,
      [
        ["comments_50", "Mitredner:in", "💭", 50, "Du mischst dich gern ein."],
        ["comments_200", "Stammgast im Salon", "🛋️", 200, "Man kennt dich in jeder Diskussion."],
        ["comments_600", "Dauerredner:in", "📢", 600, "Zum Reden bist du geboren."],
      ],
    ],
    [
      "Unterhaltung",
      "messages",
      (n) => `${n} Chat-Nachrichten senden.`,
      [
        ["msg_200", "Plaudertasche", "📨", 200, "Die Gespräche reißen nicht ab."],
        ["msg_1000", "Brieffreund:in", "📬", 1000, "Eine feste Größe im Postfach."],
        ["msg_5000", "Telegrafist:in", "📡", 5000, "Fünftausend Nachrichten – es muss viel passiert sein."],
      ],
    ],
    [
      "Story & Würfel",
      "story",
      (n) => `${n} Einträge in Story-Szenen schreiben.`,
      [
        ["story_25", "Geschichtenerzähler:in", "📖", 25, "Du bringst die Handlung voran."],
        ["story_100", "Szenenmaler:in", "🎨", 100, "Szenen werden durch dich lebendig."],
        ["story_300", "Epos-Schreiber:in", "🐉", 300, "Ganze Sagen wurden von dir getragen."],
      ],
    ],
    [
      "Story & Würfel",
      "rolls",
      (n) => `${n} Würfe in Story-Szenen würfeln.`,
      [
        ["roll_25", "Glücksspieler:in", "🍀", 25, "Du forderst das Schicksal gern heraus."],
        ["roll_100", "Schicksalsgeübt", "🔮", 100, "Du kennst jede Laune der Würfel."],
      ],
    ],
    [
      "Story & Würfel",
      "rolls_won",
      (n) => `${n} Würfe in Story-Szenen erfolgreich schaffen.`,
      [
        ["win_15", "Vom Glück geküsst", "🌠", 15, "Das Schicksal meint es gut mit dir."],
        ["win_60", "Meister:in des Zufalls", "👑", 60, "Selbst die Würfel respektieren dich."],
      ],
    ],
    [
      "Gemeinschaft",
      "followers",
      (n) => `${n} Follower gewinnen.`,
      [
        ["followers_10", "Im Gespräch", "👥", 10, "Über dich wird geredet."],
        ["followers_30", "Bekanntheit", "🌐", 30, "Dein Name reist durch die Welt."],
        ["followers_100", "Berühmtheit", "🎤", 100, "Alle kennen dich."],
      ],
    ],
    [
      "Gemeinschaft",
      "following",
      (n) => `${n} anderen Charakteren folgen.`,
      [["following_30", "Weltoffen", "🧭", 30, "Dein Horizont reicht weit.", undefined, "silber"]],
    ],
    [
      "Gemeinschaft",
      "likes_given",
      (n) => `${n} Beiträgen oder Kommentaren ein Herz geben.`,
      [
        ["given_100", "Applaus", "👏", 100, "Du gönnst anderen ihren Erfolg."],
        ["given_500", "Größte:r Fan", "🥇", 500, "Ohne dich würde so mancher Beitrag unbemerkt bleiben."],
      ],
    ],
    [
      "Gemeinschaft",
      "relationships",
      (n) => `${n} Beziehungen im Beziehungsnetz eintragen (als Beteiligte:r).`,
      [
        ["rel_5", "Verwoben", "🕸️", 5, "Du bist Teil eines dichten Geflechts."],
        ["rel_15", "Mittelpunkt des Netzes", "🌌", 15, "Alle Fäden laufen bei dir zusammen."],
      ],
    ],
    [
      "Gemeinschaft",
      "stories",
      (n) => `${n} Stories (24 Stunden) teilen.`,
      [
        ["stories_15", "Momentsammler:in", "📸", 15, "Du hältst die kleinen Augenblicke fest."],
        ["stories_75", "Chronist:in der Augenblicke", "🌅", 75, "Kaum ein Tag, den du nicht festgehalten hast."],
      ],
    ],
    [
      "Treue & Profil",
      "days",
      (n) => `Den Charakter ${n} Tage lang behalten.`,
      [
        ["days_30", "Alteingesessen", "🌳", 30, "Ein Monat – du gehörst hierher."],
        ["days_100", "Urgestein", "🪨", 100, "Du warst schon da, als alles anfing."],
        ["days_365", "Ein Jahr Wortwinkel", "🎂", 365, "Ein ganzes Jahr gemeinsame Geschichte."],
      ],
    ],
  ),
  ...A(
    [
      "Redaktion",
      "red_posts",
      (n) => `${n} Beiträge in der Redaktion veröffentlichen.`,
      [
        ["red_posts_10", "Stammgast", "☕", 10, "Man kennt dich am Redaktionstisch."],
        ["red_posts_50", "Redaktionsstütze", "🗞️", 50, "Ohne dich wäre die Redaktion leerer."],
        ["red_posts_150", "Chefredakteur:in", "🖋️", 150, "Die Redaktion trägt deine Handschrift."],
      ],
    ],
    [
      "Redaktion",
      "red_polls",
      (n) => `${n} Umfragen in der Redaktion starten.`,
      [
        ["red_poll_3", "Meinungsmacher:in", "📊", 3, "Du fragst, die anderen antworten."],
        ["red_poll_15", "Umfragekönig:in", "🗳️", 15, "Die Community entscheidet – dank dir."],
      ],
    ],
    [
      "Redaktion",
      "red_votes",
      (n) => `Bei ${n} Umfragen abstimmen.`,
      [
        ["vote_10", "Wahlberechtigt", "🏷️", 10, "Bei keiner Abstimmung fehlst du."],
        ["vote_50", "Stimme des Volkes", "✅", 50, "Deine Meinung zählt – und du teilst sie oft."],
      ],
    ],
    [
      "Redaktion",
      "red_comments",
      (n) => `${n} Kommentare in der Redaktion schreiben.`,
      [
        ["red_comments_50", "Diskutierfreudig", "🗣️", 50, "Debatten brauchen Leute wie dich."],
        ["red_comments_200", "Kommentarspalten-Legende", "🏆", 200, "Wo du bist, wird diskutiert."],
      ],
    ],
    [
      "Redaktion",
      "red_reactions",
      (n) => `${n} Reaktionen auf deine Redaktions-Beiträge bekommen.`,
      [
        ["red_reactions_50", "Gern gesehen", "🎉", 50, "Deine Beiträge kommen gut an."],
        ["red_reactions_250", "Publikumsmagnet", "🧲", 250, "Alle Blicke gehören dir."],
      ],
    ],
    [
      "Redaktion",
      "red_reactions_given",
      (n) => `${n} Mal auf Redaktions-Beiträge reagieren.`,
      [
        ["given_100_red", "Reaktionsfreudig", "😍", 100, "Du zeigst, was dir gefällt."],
        ["given_500_red", "Emoji-Regen", "🌈", 500, "Ein bunter Schauer an Reaktionen."],
      ],
    ],
    [
      "Gemeinschaft",
      "friends",
      (n) => `${n} Freund:innen gewinnen (angenommene Freundschaften).`,
      [
        ["friends_5", "Freundeskreis", "🫂", 5, "Ein kleiner, feiner Kreis."],
        ["friends_15", "Gesellig", "🥳", 15, "Bei dir ist immer was los."],
      ],
    ],
    [
      "Welten & Werkzeuge",
      "characters",
      (n) => `${n} eigene Charaktere anlegen (über alle Welten).`,
      [
        ["chars_5", "Rollenwechsler:in", "🎭", 5, "Mehrere Leben, mehrere Geschichten."],
        ["chars_12", "Ensemble", "🎪", 12, "Eine ganze Theatertruppe in einer Person."],
      ],
    ],
    [
      "Welten & Werkzeuge",
      "wiki",
      (n) => `${n} Wiki-Seiten in einer Welt anlegen.`,
      [
        ["wiki_5", "Weltenbauer:in", "🗺️", 5, "Du gibst der Welt Tiefe."],
        ["wiki_25", "Lexikograf:in", "📜", 25, "Dein Wissen füllt ganze Bände."],
      ],
    ],
    [
      "Welten & Werkzeuge",
      "badge_defs",
      (n) => `${n} eigene Badges für eine Welt gestalten.`,
      [["smith_3", "Badge-Schmied:in", "🔨", 3, "Du schmiedest Auszeichnungen für andere.", undefined, "silber"]],
    ],
    [
      "Treue",
      "acc_days",
      (n) => `Den Account ${n} Tage lang haben.`,
      [
        ["acc_90", "Drei Monate dabei", "🌱", 90, "Aus Neugier wird Gewohnheit."],
        ["acc_365", "Ein Jahr dabei", "🌳", 365, "Ein Jahr voller Geschichten."],
        ["acc_730", "Zwei Jahre dabei", "🌲", 730, "Du bist längst Teil der Familie."],
      ],
    ],
  ),
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
  // Vom Besitzer ausgeblendet: nicht im Profil, nicht in der Sammlung anderer, nicht im Verlauf.
  hidden?: boolean;
};

export const BADGE_PROFILE_KEY = "wortwinkel:badges-profile";
export const BADGE_NAMES_KEY = "wortwinkel:badges-names";
export const BADGE_PREF_EVENT = "wortwinkel:badge-pref-change";
