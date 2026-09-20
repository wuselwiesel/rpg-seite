import "server-only";
import sanitizeHtml from "sanitize-html";
import { createClient } from "@/lib/supabase/server";
import { stripHtml } from "@/lib/strip-html";

export type BookEntry = {
  kind: "entry" | "narrator" | "chapter" | "roll";
  author: string;
  html: string;
  chapterTitle?: string;
  chapterSummary?: string;
};

export type BookScene = {
  id: string;
  title: string;
  author: string;
  location: string | null;
  time: string | null;
  introHtml: string;
  entries: BookEntry[];
  coverImage: string | null;
};

export type Book = { title: string; subtitle: string; worldName: string; coverImage: string | null; scenes: BookScene[] };

type SceneRow = {
  id: string;
  title: string;
  content: string;
  location: string | null;
  in_world_time: string | null;
  created_at: string;
  characters: { name: string } | null;
  worlds: { name: string; cover_image_url: string | null } | null;
  story_arcs: { name: string } | null;
};

type EntryRow = {
  story_post_id: string;
  content: string;
  kind: string | null;
  chapter_title: string | null;
  chapter_summary: string | null;
  roll_label: string | null;
  roll_result: number | null;
  roll_value: number | null;
  roll_die: number | null;
  roll_success: boolean | null;
  created_at: string;
  characters: { name: string } | null;
};

export async function loadBook(scope: { sceneId: string } | { arcId: string }): Promise<Book | null> {
  const supabase = await createClient();
  const select = "id, title, content, location, in_world_time, created_at, characters!story_posts_character_id_fkey(name), worlds(name, cover_image_url), story_arcs(name)";
  let rows: SceneRow[] = [];
  let arcName: string | null = null;
  if ("sceneId" in scope) {
    const { data } = await supabase.from("story_posts").select(select).eq("id", scope.sceneId).returns<SceneRow[]>();
    rows = data ?? [];
  } else {
    const { data } = await supabase
      .from("story_posts")
      .select(select)
      .eq("arc_id", scope.arcId)
      .order("created_at", { ascending: true })
      .returns<SceneRow[]>();
    rows = data ?? [];
    arcName = rows[0]?.story_arcs?.name ?? null;
  }
  if (rows.length === 0) return null;

  const { data: entryRows } = await supabase
    .from("story_entries")
    .select("story_post_id, content, kind, chapter_title, chapter_summary, roll_label, roll_result, roll_value, roll_die, roll_success, created_at, characters!story_entries_character_id_fkey(name)")
    .in("story_post_id", rows.map((r) => r.id))
    .order("created_at", { ascending: true })
    .returns<EntryRow[]>();

  const scenes: BookScene[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.characters?.name ?? "Unbekannt",
    location: r.location,
    time: r.in_world_time,
    introHtml: r.content,
    coverImage: firstImage(r.content),
    entries: (entryRows ?? [])
      .filter((e) => e.story_post_id === r.id)
      .map((e): BookEntry => {
        if (e.kind === "chapter") {
          return { kind: "chapter", author: e.characters?.name ?? "", html: "", chapterTitle: e.chapter_title ?? stripHtml(e.content), chapterSummary: e.chapter_summary ?? undefined };
        }
        if (e.roll_label) {
          const text = `würfelt auf „${e.roll_label}“: ${e.roll_result}/${e.roll_value} (W${e.roll_die}) – ${e.roll_success ? "Erfolg" : "Misserfolg"}`;
          return { kind: "roll", author: e.characters?.name ?? "", html: `<p>${escapeXml(text)}</p>` };
        }
        return { kind: e.kind === "narrator" ? "narrator" : "entry", author: e.characters?.name ?? "", html: e.content };
      }),
  }));

  const first = rows[0];
  const worldName = first.worlds?.name ?? "";
  return {
    title: arcName ?? first.title,
    subtitle: arcName ? `${scenes.length} Szene${scenes.length === 1 ? "" : "n"} aus ${worldName}` : `Eine Geschichte aus ${worldName}`,
    worldName,
    coverImage: scenes.map((s) => s.coverImage).find(Boolean) ?? first.worlds?.cover_image_url ?? null,
    scenes,
  };
}

function firstImage(html: string): string | null {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Reines, wohlgeformtes XHTML ohne Bilder, Links und Attribute (für EPUB).
function cleanXhtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "hr"],
    allowedAttributes: {},
    selfClosing: ["br", "hr"],
  });
}

// --- Minimaler ZIP-Schreiber (ohne Kompression), genügt für EPUB ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zip(files: { name: string; data: Buffer }[]): Buffer {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const dosTime = 0;
  const dosDate = (46 << 9) | (1 << 5) | 1; // 2026-01-01 (feste Zeit für reproduzierbare Dateien)
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8-Dateinamen
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, f.data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(0, 10);
    c.writeUInt16LE(dosTime, 12);
    c.writeUInt16LE(dosDate, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(f.data.length, 20);
    c.writeUInt32LE(f.data.length, 24);
    c.writeUInt16LE(name.length, 28);
    c.writeUInt32LE(offset, 42);
    central.push(c, name);
    offset += 30 + name.length + f.data.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, end]);
}

function wrapWords(text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if ((line + " " + word).trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function coverSvg(book: Book): string {
  const lines = wrapWords(book.title, 16);
  const start = 780 - (lines.length - 1) * 60;
  const title = lines.map((l, i) => `<text x="600" y="${start + i * 120}" text-anchor="middle" font-family="Georgia, serif" font-size="96" font-weight="bold" fill="#f6efe6">${escapeXml(l)}</text>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800" width="1200" height="1800">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2b4d"/><stop offset="1" stop-color="#8a4a5d"/></linearGradient></defs>
<rect width="1200" height="1800" fill="url(#g)"/>
<rect x="60" y="60" width="1080" height="1680" fill="none" stroke="#f6efe6" stroke-opacity="0.5" stroke-width="4"/>
${title}
<text x="600" y="${start + lines.length * 120 + 60}" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#e8d6dc">${escapeXml(book.subtitle)}</text>
<text x="600" y="1640" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="#e8d6dc" opacity="0.8">Wortwinkel</text>
</svg>`;
}

export function buildEpub(book: Book, id: string): Buffer {
  const chapters: { file: string; title: string; xhtml: string }[] = [];
  const doc = (title: string, body: string) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="de" lang="de"><head><meta charset="utf-8"/><title>${escapeXml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body>${body}</body></html>`;

  book.scenes.forEach((scene, i) => {
    const meta = [scene.location, scene.time].filter(Boolean).join(" · ");
    let body = `<h1>${escapeXml(scene.title)}</h1>`;
    if (meta) body += `<p class="meta">${escapeXml(meta)}</p>`;
    body += cleanXhtml(scene.introHtml);
    for (const e of scene.entries) {
      if (e.kind === "chapter") {
        body += `<h2 class="chapter">${escapeXml(e.chapterTitle ?? "")}</h2>`;
        if (e.chapterSummary) body += `<p class="summary">${escapeXml(e.chapterSummary)}</p>`;
      } else if (e.kind === "narrator") {
        body += `<div class="narrator">${cleanXhtml(e.html)}</div>`;
      } else if (e.kind === "roll") {
        body += `<div class="roll"><p class="who">${escapeXml(e.author)}</p>${e.html}</div>`;
      } else {
        body += `<div class="entry"><p class="who">${escapeXml(e.author)}</p>${cleanXhtml(e.html)}</div>`;
      }
    }
    chapters.push({ file: `scene${i + 1}.xhtml`, title: scene.title, xhtml: doc(scene.title, body) });
  });

  const titlePage = doc(
    book.title,
    `<div class="titlepage"><h1>${escapeXml(book.title)}</h1><p class="sub">${escapeXml(book.subtitle)}</p><p class="brand">Wortwinkel</p></div>`,
  );
  const nav = `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="de" lang="de"><head><meta charset="utf-8"/><title>Inhalt</title></head><body><nav epub:type="toc" id="toc"><h1>Inhalt</h1><ol>${chapters
    .map((c) => `<li><a href="${c.file}">${escapeXml(c.title)}</a></li>`)
    .join("")}</ol></nav></body></html>`;

  const css = `body{font-family:Georgia,serif;line-height:1.55;margin:1em}h1{font-size:1.7em;margin:1.2em 0 .3em}h2.chapter{text-align:center;margin:2em 0 .3em}.meta,.summary{color:#666;font-style:italic;text-align:center}.who{font-weight:bold;font-size:.85em;margin:1.2em 0 0;color:#6b3e4a}.narrator{font-style:italic;margin:1.2em 1em}.roll{font-size:.9em;color:#555}.titlepage{text-align:center;margin-top:30%}.titlepage h1{font-size:2.2em}.brand{margin-top:3em;color:#999}`;
  const opf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="de">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${escapeXml(id)}</dc:identifier>
<dc:title>${escapeXml(book.title)}</dc:title>
<dc:creator>Wortwinkel</dc:creator>
<dc:language>de</dc:language>
<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta>
<meta name="cover" content="cover-image"/>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
<item id="cover-image" href="cover.svg" media-type="image/svg+xml" properties="cover-image"/>
<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
${chapters.map((c, i) => `<item id="s${i + 1}" href="${c.file}" media-type="application/xhtml+xml"/>`).join("\n")}
</manifest>
<spine>
<itemref idref="title"/>
${chapters.map((_, i) => `<itemref idref="s${i + 1}"/>`).join("\n")}
</spine>
</package>`;
  const container = `<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;

  const f = (name: string, text: string) => ({ name, data: Buffer.from(text, "utf8") });
  return zip([
    f("mimetype", "application/epub+zip"),
    f("META-INF/container.xml", container),
    f("OEBPS/content.opf", opf),
    f("OEBPS/nav.xhtml", nav),
    f("OEBPS/style.css", css),
    f("OEBPS/cover.svg", coverSvg(book)),
    f("OEBPS/title.xhtml", titlePage),
    ...chapters.map((c) => f(`OEBPS/${c.file}`, c.xhtml)),
  ]);
}
