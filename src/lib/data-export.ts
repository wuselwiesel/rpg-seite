import "server-only";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Row = Record<string, unknown>;
type Page = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;

const PAGE = 1000;
const CHUNK = 80;

// Holt alle Zeilen einer Abfrage seitenweise (die Datenbank liefert pro Anfrage höchstens 1000).
async function all(page: (from: number, to: number) => Page): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const col = (rows: Row[], key: string) => [...new Set(rows.map((r) => r[key]).filter((v): v is string => typeof v === "string"))];

// Zeilen, deren Spalte `column` einen der Werte hat (in Päckchen, damit die Adresse nicht zu lang wird).
async function byValues(sb: Supabase, table: string, column: string, values: string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < values.length; i += CHUNK) {
    const part = values.slice(i, i + CHUNK);
    out.push(...(await all((f, t) => sb.from(table).select("*").in(column, part).range(f, t))));
  }
  return out;
}

const forWorld = (sb: Supabase, table: string, worldId: string) => all((f, t) => sb.from(table).select("*").eq("world_id", worldId).range(f, t));

const EXPORT_NOTE = "Export aus Wortwinkel. Enthält, was dein Konto sehen darf.";

// Eine ganze Welt zum Aufbewahren: Mitglieder, Charaktere (ohne Geheimes), Szenen mit allen Einträgen, Beiträge mit Kommentaren, Wiki, Zeitleiste/Kalender, Beziehungen.
export async function exportWorld(worldId: string) {
  const sb = await createClient();
  const { data: world } = await sb.from("worlds").select("*").eq("id", worldId).maybeSingle();
  if (!world) return null;

  const [members, characters, scenes, wikiPages, wikiFolders, wikiTypes, wikiMaps, wikiCalendars, relationships, history, arcs, badgeDefs, emojis, randomEntries] = await Promise.all([
    all((f, t) => sb.from("world_members").select("world_id, user_id, role, joined_at, profiles(username, nickname)").eq("world_id", worldId).range(f, t)),
    forWorld(sb, "characters", worldId),
    forWorld(sb, "story_posts", worldId),
    forWorld(sb, "wiki_pages", worldId),
    forWorld(sb, "wiki_folders", worldId),
    forWorld(sb, "wiki_types", worldId),
    forWorld(sb, "wiki_maps", worldId),
    forWorld(sb, "wiki_calendars", worldId),
    forWorld(sb, "character_relationships", worldId),
    forWorld(sb, "relationship_history", worldId),
    forWorld(sb, "story_arcs", worldId),
    forWorld(sb, "badge_defs", worldId),
    forWorld(sb, "custom_emojis", worldId),
    forWorld(sb, "world_random_entries", worldId),
  ]);

  const characterIds = col(characters, "id");
  const sceneIds = col(scenes, "id");
  const mapIds = col(wikiMaps, "id");
  const [entries, posts, sheets] = await Promise.all([
    byValues(sb, "story_entries", "story_post_id", sceneIds),
    byValues(sb, "posts", "character_id", characterIds),
    byValues(sb, "character_sheets", "character_id", characterIds),
  ]);
  const [comments, pins] = await Promise.all([byValues(sb, "comments", "post_id", col(posts, "id")), byValues(sb, "wiki_map_pins", "map_id", mapIds)]);

  return {
    hinweis: EXPORT_NOTE,
    exportiert_am: new Date().toISOString(),
    welt: world,
    mitglieder: members,
    charaktere: characters.map((c) => ({ ...c, charakterbogen: sheets.find((s) => s.character_id === c.id) ?? null })),
    szenen: scenes.map((s) => ({ ...s, eintraege: entries.filter((e) => e.story_post_id === s.id) })),
    erzaehlstraenge: arcs,
    beitraege: posts.map((p) => ({ ...p, kommentare: comments.filter((c) => c.post_id === p.id) })),
    wiki: { seiten: wikiPages, ordner: wikiFolders, typen: wikiTypes, karten: wikiMaps.map((m) => ({ ...m, pins: pins.filter((p) => p.map_id === m.id) })), kalender: wikiCalendars },
    beziehungen: relationships,
    beziehungsverlauf: history,
    abzeichen: badgeDefs,
    emojis,
    zufallslisten: randomEntries,
  };
}

// Alles, was zu einem Konto gehört und für dieses Konto sichtbar ist.
export async function exportAccount(userId: string) {
  const sb = await createClient();
  const [profile, redaktionProfile, prefs, chars, friendships, redaktionPosts, redaktionComments, accountChatRows, customEmojis, wikiCreated, themes] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle().then((r) => r.data),
    sb.from("redaktion_profiles").select("*").eq("user_id", userId).maybeSingle().then((r) => r.data),
    sb.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle().then((r) => r.data),
    all((f, t) => sb.from("characters").select("*, worlds(name)").eq("owner_id", userId).range(f, t)),
    all((f, t) => sb.from("friendships").select("status, created_at, requester:requester_id(username), addressee:addressee_id(username)").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).range(f, t)),
    all((f, t) => sb.from("redaktion_posts").select("*").eq("author_id", userId).range(f, t)),
    all((f, t) => sb.from("redaktion_comments").select("*").eq("author_id", userId).range(f, t)),
    all((f, t) => sb.from("account_chat_participants").select("chat_id, muted, account_chats(kind, name, worlds(name))").eq("user_id", userId).range(f, t)),
    all((f, t) => sb.from("custom_emojis").select("*").eq("created_by", userId).range(f, t)),
    all((f, t) => sb.from("wiki_pages").select("*").eq("created_by", userId).range(f, t)),
    all((f, t) => sb.from("chat_themes").select("*").eq("user_id", userId).range(f, t)),
  ]);

  const characterIds = col(chars, "id");
  const chatIds = col(accountChatRows, "chat_id");
  const [sheets, secrets, posts, stories, highlights, rpMessages, entries, scenes, relationships, badges, accountMessages] = await Promise.all([
    byValues(sb, "character_sheets", "character_id", characterIds),
    byValues(sb, "character_sheet_secrets", "character_id", characterIds),
    byValues(sb, "posts", "character_id", characterIds),
    byValues(sb, "stories", "character_id", characterIds),
    byValues(sb, "highlights", "character_id", characterIds),
    byValues(sb, "messages", "character_id", characterIds),
    byValues(sb, "story_entries", "character_id", characterIds),
    byValues(sb, "story_posts", "character_id", characterIds),
    byValues(sb, "character_relationships", "character_a_id", characterIds),
    byValues(sb, "badge_awards", "character_id", characterIds),
    byValues(sb, "account_messages", "chat_id", chatIds),
  ]);
  const comments = await byValues(sb, "comments", "character_id", characterIds);

  return {
    hinweis: EXPORT_NOTE,
    exportiert_am: new Date().toISOString(),
    konto: profile,
    redaktions_profil: redaktionProfile,
    benachrichtigungs_einstellungen: prefs,
    freundschaften: friendships,
    charaktere: chars.map((c) => ({
      ...c,
      charakterbogen: sheets.find((s) => s.character_id === c.id) ?? null,
      geheimes: secrets.find((s) => s.character_id === c.id) ?? null,
    })),
    beitraege: posts,
    kommentare: comments,
    stories,
    highlights,
    szenen_geschrieben: scenes,
    story_eintraege: entries,
    chat_nachrichten_rpg: rpMessages,
    beziehungen: relationships,
    abzeichen: badges,
    redaktion: { beitraege: redaktionPosts, kommentare: redaktionComments },
    redaktions_chats: accountChatRows.map((c) => ({ ...c, nachrichten: accountMessages.filter((m) => m.chat_id === c.chat_id) })),
    eigene_emojis: customEmojis,
    wiki_seiten_erstellt: wikiCreated,
    chat_farben: themes,
  };
}

// Dateiname aus einem Titel (ohne Sonderzeichen)
export function exportFileName(title: string, extension = "json"): string {
  const base = title.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Wortwinkel";
  return `${base}.${extension}`;
}
