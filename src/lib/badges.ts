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

type Row = [key: string, name: string, icon: string, threshold: number, meaning: string, color?: string];

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
  return rows.map(([key, name, icon, threshold, meaning, color], i) => {
    const tier = tierFor(i, rows.length);
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

const nx = (n: number, one: string, many: string) => (n === 1 ? `Ein ${one}` : `${n} ${many}`);

export const AUTO_BADGES: AutoBadgeDef[] = [
  ...C(
    [
      "Beiträge",
      "posts",
      (n) => `${nx(n, "Beitrag", "Beiträge")} im Feed veröffentlichen.`,
      [
        ["first_post", "Erster Beitrag", "📝", 1, "Die Feder ist angesetzt – die Geschichte beginnt."],
        ["posts_5", "Warmgeschrieben", "🖋️", 5, "Der Anfang ist gemacht, die Worte fließen."],
        ["posts_10", "Vielschreiber:in", "✍️", 10, "Wer so oft schreibt, hat viel zu erzählen."],
        ["posts_25", "Feder in Fahrt", "🪶", 25, "Kaum ein Tag vergeht ohne neue Zeilen."],
        ["posts_50", "Chronist:in", "📚", 50, "Das Leben dieser Figur ist gut dokumentiert."],
        ["posts_100", "Archivar:in", "🏛️", 100, "Hundert Beiträge – ein ganzes Archiv."],
        ["posts_250", "Unerschöpflich", "♾️", 250, "Die Ideen scheinen nie auszugehen."],
      ],
    ],
    [
      "Beiträge",
      "media_posts",
      (n) => `${nx(n, "Beitrag", "Beiträge")} mit Bild oder Video veröffentlichen.`,
      [
        ["media_1", "Erstes Bild", "📷", 1, "Ein Bild sagt mehr als tausend Worte."],
        ["media_10", "Bildermacher:in", "🖼️", 10, "Die Welt bekommt Gesichter und Orte."],
        ["media_50", "Galerist:in", "🎞️", 50, "Eine eigene Ausstellung voller Momente."],
      ],
    ],
    [
      "Beliebtheit",
      "likes",
      (n) => `${n} Herzen auf deine Beiträge bekommen.`,
      [
        ["likes_1", "Erstes Herz", "💗", 1, "Jemand hat dich bemerkt."],
        ["likes_10", "Kleiner Schwarm", "💞", 10, "Die ersten Fans sammeln sich."],
        ["likes_25", "Beliebt", "❤️", 25, "Deine Beiträge kommen an."],
        ["likes_100", "Publikumsliebling", "🌟", 100, "Der Feed wartet schon auf den nächsten Beitrag."],
        ["likes_500", "Herzensbrecher:in", "💎", 500, "Eine Legende unter den Lieblingsfiguren."],
      ],
    ],
    [
      "Beliebtheit",
      "reactions",
      (n) => `${n} Emoji-Reaktionen auf deine Beiträge bekommen.`,
      [
        ["react_10", "Anklang", "🎭", 10, "Die ersten Reaktionen trudeln ein."],
        ["react_50", "Echo", "🔔", 50, "Deine Worte hallen nach."],
        ["react_200", "Gefeierte Stimme", "📣", 200, "Eine Stimme, die man gern hört."],
      ],
    ],
    [
      "Unterhaltung",
      "comments",
      (n) => `${nx(n, "Kommentar", "Kommentare")} unter Beiträgen schreiben.`,
      [
        ["comment_1", "Erstes Wort", "🗨️", 1, "Der erste Schritt ins Gespräch."],
        ["comments_10", "Mitredner:in", "💭", 10, "Du mischst dich gern ein."],
        ["comments_25", "Gesprächig", "💬", 25, "Ohne dich wäre es still in den Kommentaren."],
        ["comments_100", "Stammgast im Salon", "🛋️", 100, "Man kennt dich in jeder Diskussion."],
        ["comments_250", "Dauerredner:in", "📢", 250, "Zum Reden bist du geboren."],
      ],
    ],
    [
      "Unterhaltung",
      "messages",
      (n) => `${nx(n, "Chat-Nachricht", "Chat-Nachrichten")} senden.`,
      [
        ["msg_1", "Erste Nachricht", "✉️", 1, "Der erste Brief ist unterwegs."],
        ["msg_50", "Plaudertasche", "📨", 50, "Die Gespräche reißen nicht ab."],
        ["msg_250", "Brieffreund:in", "📬", 250, "Eine feste Größe im Postfach."],
        ["msg_1000", "Telegrafist:in", "📡", 1000, "Eintausend Nachrichten – es muss viel passiert sein."],
      ],
    ],
    [
      "Story & Würfel",
      "story",
      (n) => `${nx(n, "Eintrag", "Einträge")} in Story-Szenen schreiben.`,
      [
        ["story_1", "Erste Szene", "🎬", 1, "Der Vorhang hebt sich."],
        ["story_10", "Geschichtenerzähler:in", "📖", 10, "Du bringst die Handlung voran."],
        ["story_25", "Szenenmaler:in", "🎨", 25, "Szenen werden durch dich lebendig."],
        ["story_50", "Legende der Story", "🏰", 50, "Ohne dich wäre die Geschichte eine andere."],
        ["story_150", "Epos-Schreiber:in", "🐉", 150, "Ganze Sagen wurden von dir getragen."],
      ],
    ],
    [
      "Story & Würfel",
      "rolls",
      (n) => `${nx(n, "Wurf", "Würfe")} in einer Story-Szene würfeln.`,
      [
        ["roll_1", "Erster Wurf", "🎲", 1, "Alea iacta est – die Würfel sind gefallen."],
        ["roll_10", "Glücksspieler:in", "🍀", 10, "Du forderst das Schicksal gern heraus."],
        ["roll_50", "Schicksalsgeübt", "🔮", 50, "Du kennst jede Laune der Würfel."],
      ],
    ],
    [
      "Story & Würfel",
      "rolls_won",
      (n) => `${nx(n, "Wurf", "Würfe")} in Story-Szenen erfolgreich schaffen.`,
      [
        ["win_5", "Vom Glück geküsst", "🌠", 5, "Das Schicksal meint es gut mit dir."],
        ["win_25", "Meister:in des Zufalls", "👑", 25, "Selbst die Würfel respektieren dich."],
      ],
    ],
    [
      "Gemeinschaft",
      "followers",
      (n) => `${nx(n, "Follower", "Follower")} gewinnen.`,
      [
        ["follower_1", "Erster Fan", "🙋", 1, "Jemand will mehr von dir lesen."],
        ["followers_5", "Kleiner Kreis", "🕯️", 5, "Ein Kreis von Interessierten bildet sich."],
        ["followers_10", "Im Gespräch", "👥", 10, "Über dich wird geredet."],
        ["followers_25", "Bekanntheit", "🌐", 25, "Dein Name reist durch die Welt."],
        ["followers_50", "Berühmtheit", "🎤", 50, "Alle kennen dich."],
      ],
    ],
    [
      "Gemeinschaft",
      "following",
      (n) => `${n} andere Charaktere folgen.`,
      [
        ["following_5", "Neugierig", "🔍", 5, "Du willst wissen, was die anderen treiben."],
        ["following_20", "Weltoffen", "🧭", 20, "Dein Horizont reicht weit."],
      ],
    ],
    [
      "Gemeinschaft",
      "likes_given",
      (n) => `${n} Beiträgen oder Kommentaren ein Herz geben.`,
      [
        ["given_25", "Applaus", "👏", 25, "Du gönnst anderen ihren Erfolg."],
        ["given_200", "Größte:r Fan", "🥇", 200, "Ohne dich würde so mancher Beitrag unbemerkt bleiben."],
      ],
    ],
    [
      "Gemeinschaft",
      "relationships",
      (n) => `${nx(n, "Beziehung", "Beziehungen")} im Beziehungsnetz eintragen (als Beteiligte:r).`,
      [
        ["rel_1", "Erste Verbindung", "🧵", 1, "Ein Faden verbindet dich mit jemandem."],
        ["rel_5", "Verwoben", "🕸️", 5, "Du bist Teil eines dichten Geflechts."],
        ["rel_10", "Mittelpunkt des Netzes", "🌌", 10, "Alle Fäden laufen bei dir zusammen."],
      ],
    ],
    [
      "Gemeinschaft",
      "stories",
      (n) => `${nx(n, "Story", "Stories")} (24 Stunden) teilen.`,
      [
        ["stories_1", "Flüchtiger Moment", "⏳", 1, "Ein Augenblick, der schon morgen verschwunden ist."],
        ["stories_10", "Momentsammler:in", "📸", 10, "Du hältst die kleinen Augenblicke fest."],
      ],
    ],
    [
      "Treue & Profil",
      "days",
      (n) => `Den Charakter ${n} Tage lang behalten.`,
      [
        ["days_7", "Eingelebt", "🏡", 7, "Die erste Woche in der Welt liegt hinter dir."],
        ["days_30", "Alteingesessen", "🌳", 30, "Ein Monat – du gehörst hierher."],
        ["days_100", "Urgestein", "🪨", 100, "Du warst schon da, als alles anfing."],
        ["days_365", "Ein Jahr Wortwinkel", "🎂", 365, "Ein ganzes Jahr gemeinsame Geschichte."],
      ],
    ],
    [
      "Treue & Profil",
      "profile",
      () => "Profilbild, Banner, Bio und Status-Zeile des Charakters ausfüllen.",
      [["profile_full", "Gut vorgestellt", "🪞", 1, "Ein Profil, das neugierig macht.", "#4a8f7a"]],
    ],
  ),
  ...A(
    [
      "Redaktion",
      "red_posts",
      (n) => `${nx(n, "Beitrag", "Beiträge")} in der Redaktion veröffentlichen.`,
      [
        ["red_first", "Erste Redaktion", "📰", 1, "Du hast dich in die Redaktion gewagt."],
        ["red_posts_10", "Stammgast", "☕", 10, "Man kennt dich am Redaktionstisch."],
        ["red_posts_50", "Redaktionsstütze", "🗞️", 50, "Ohne dich wäre die Redaktion leerer."],
      ],
    ],
    [
      "Redaktion",
      "red_polls",
      (n) => `${nx(n, "Umfrage", "Umfragen")} in der Redaktion starten.`,
      [
        ["red_poll", "Meinungsmacher:in", "📊", 1, "Du fragst, die anderen antworten."],
        ["red_poll_5", "Umfragekönig:in", "🗳️", 5, "Die Community entscheidet – dank dir."],
      ],
    ],
    [
      "Redaktion",
      "red_votes",
      (n) => `Bei ${nx(n, "Umfrage", "Umfragen")} abstimmen.`,
      [
        ["vote_1", "Stimme erhoben", "✅", 1, "Deine Meinung zählt."],
        ["vote_10", "Wahlberechtigt", "🏷️", 10, "Bei keiner Abstimmung fehlst du."],
      ],
    ],
    [
      "Redaktion",
      "red_comments",
      (n) => `${nx(n, "Kommentar", "Kommentare")} in der Redaktion schreiben.`,
      [
        ["red_comment_1", "Erste Wortmeldung", "🙌", 1, "Du hast dich in die Diskussion eingebracht."],
        ["red_comments_25", "Diskutierfreudig", "🗣️", 25, "Debatten brauchen Leute wie dich."],
        ["red_comments_100", "Kommentarspalten-Legende", "🏆", 100, "Wo du bist, wird diskutiert."],
      ],
    ],
    [
      "Redaktion",
      "red_reactions",
      (n) => `${n} Reaktionen auf deine Redaktions-Beiträge bekommen.`,
      [
        ["red_reactions_25", "Gern gesehen", "🎉", 25, "Deine Beiträge kommen gut an."],
        ["red_reactions_100", "Publikumsmagnet", "🧲", 100, "Alle Blicke gehören dir."],
      ],
    ],
    [
      "Redaktion",
      "red_reactions_given",
      (n) => `${n} Mal auf Redaktions-Beiträge reagieren.`,
      [
        ["given_25", "Reaktionsfreudig", "😍", 25, "Du zeigst, was dir gefällt."],
        ["given_200", "Emoji-Regen", "🌈", 200, "Ein bunter Schauer an Reaktionen."],
      ],
    ],
    [
      "Gemeinschaft",
      "friends",
      (n) => `${nx(n, "Freund:in", "Freund:innen")} gewinnen (angenommene Freundschaften).`,
      [
        ["friend_1", "Erste Freundschaft", "🤝", 1, "Du bist nicht mehr allein hier."],
        ["friends_5", "Freundeskreis", "🫂", 5, "Ein kleiner, feiner Kreis."],
        ["friends_15", "Gesellig", "🥳", 15, "Bei dir ist immer was los."],
      ],
    ],
    [
      "Welten & Werkzeuge",
      "characters",
      (n) => `${n} eigene Charaktere anlegen (über alle Welten).`,
      [
        ["chars_3", "Rollenwechsler:in", "🎭", 3, "Mehrere Leben, mehrere Geschichten."],
        ["chars_10", "Ensemble", "🎪", 10, "Eine ganze Theatertruppe in einer Person."],
      ],
    ],
    [
      "Welten & Werkzeuge",
      "wiki",
      (n) => `${nx(n, "Wiki-Seite", "Wiki-Seiten")} in einer Welt anlegen.`,
      [
        ["wiki_1", "Weltenbauer:in", "🗺️", 1, "Du gibst der Welt Tiefe."],
        ["wiki_10", "Lexikograf:in", "📜", 10, "Dein Wissen füllt ganze Bände."],
      ],
    ],
    [
      "Welten & Werkzeuge",
      "badge_defs",
      (n) => `${nx(n, "eigenes Badge", "eigene Badges")} für eine Welt gestalten.`,
      [["smith_1", "Badge-Schmied:in", "🔨", 1, "Du schmiedest Auszeichnungen für andere."]],
    ],
    [
      "Treue",
      "acc_days",
      (n) => `Den Account ${n} Tage lang haben.`,
      [
        ["acc_30", "Einen Monat dabei", "🌱", 30, "Aus Neugier wird Gewohnheit."],
        ["acc_180", "Ein halbes Jahr dabei", "🌿", 180, "Du bist längst Teil der Familie."],
        ["acc_365", "Ein Jahr dabei", "🌳", 365, "Ein Jahr voller Geschichten."],
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
};

export const BADGE_PROFILE_KEY = "wortwinkel:badges-profile";
export const BADGE_NAMES_KEY = "wortwinkel:badges-names";
export const BADGE_PREF_EVENT = "wortwinkel:badge-pref-change";
