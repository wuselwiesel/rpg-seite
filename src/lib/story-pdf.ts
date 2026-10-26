import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Book } from "@/lib/story-book";
import { stripHtml } from "@/lib/strip-html";

// PDF einer Szene oder eines Buchs ohne React (pdf-lib). @react-pdf/renderer lief in Next-Routen nicht
// (unter der Bedingung „react-server“ fehlen die React-Interna: „Cannot read properties of undefined (reading 'S')“).
// Die Standardschriften (Times) können nur Latin-1/WinAnsi: Umlaute, ß und typografische Anführungszeichen gehen,
// Emojis und Sonderzeichen werden durch „?“ ersetzt beziehungsweise weggelassen.

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 56;
const TEXT_W = PAGE_W - 2 * MARGIN;

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };

function cleaner(font: PDFFont) {
  const allowed = new Set(font.getCharacterSet());
  return (text: string) =>
    Array.from(text.replace(/\u00a0/g, " ").replace(/[\u200b-\u200f\u2060\ufe0e\ufe0f\u{1f3fb}-\u{1f3ff}]/gu, ""))
      .map((ch) => {
        if (ch === "\n" || ch === "\t") return ch === "\t" ? " " : ch;
        if (allowed.has(ch.codePointAt(0)!)) return ch;
        // Emojis und andere nicht darstellbare Zeichen: weglassen (ein „?“ pro Zeichen wäre unruhig)
        return (ch.codePointAt(0)! > 0xffff || /\p{Extended_Pictographic}/u.test(ch)) ? "" : "?";
      })
      .join("");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (let word of words) {
      // Sehr lange Wörter (Adressen) hart umbrechen
      while (font.widthOfTextAtSize(word, size) > maxWidth) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > maxWidth) cut--;
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export async function buildBookPdf(book: Book): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };
  const clean = cleaner(fonts.regular);
  doc.setTitle(clean(book.title));
  doc.setAuthor("Wortwinkel");
  doc.setLanguage("de");

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const space = (h: number) => {
    if (y - h < MARGIN) newPage();
  };

  // Block aus Zeilen schreiben; bricht bei Bedarf auf die nächste Seite um
  function write(text: string, opts: { font: PDFFont; size: number; color?: [number, number, number]; align?: "left" | "center"; indent?: number; gapBefore?: number; gapAfter?: number }) {
    const { font, size, color = [0.13, 0.13, 0.13], align = "left", indent = 0, gapBefore = 0, gapAfter = 0 } = opts;
    const lines = wrap(clean(text), font, size, TEXT_W - 2 * indent);
    if (lines.length === 0) return;
    const lead = size * 1.4;
    y -= gapBefore;
    space(lead);
    for (const line of lines) {
      space(lead);
      if (line) {
        const w = font.widthOfTextAtSize(line, size);
        const x = align === "center" ? (PAGE_W - w) / 2 : MARGIN + indent;
        page.drawText(line, { x, y: y - size, size, font, color: rgb(...color) });
      }
      y -= lead;
    }
    y -= gapAfter;
  }

  const rule = () => {
    space(20);
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 12;
  };

  const multi = book.scenes.length > 1;
  if (multi) {
    // Titelseite des Buchs
    y -= 160;
    write(book.title, { font: fonts.bold, size: 28, align: "center", gapAfter: 8 });
    write(book.subtitle, { font: fonts.regular, size: 13, color: [0.4, 0.4, 0.4], align: "center", gapAfter: 6 });
    write("Wortwinkel", { font: fonts.regular, size: 10, color: [0.6, 0.6, 0.6], align: "center" });
  }

  book.scenes.forEach((scene, i) => {
    if (multi) newPage();
    else if (i === 0) y -= 0;
    write(scene.title, { font: fonts.bold, size: multi ? 18 : 26, align: multi ? "left" : "center", gapAfter: 4 });
    if (!multi) {
      write(book.subtitle, { font: fonts.regular, size: 13, color: [0.4, 0.4, 0.4], align: "center", gapAfter: 2 });
      write("Wortwinkel", { font: fonts.regular, size: 10, color: [0.6, 0.6, 0.6], align: "center", gapAfter: 14 });
    }
    const meta = [scene.location, scene.time].filter(Boolean).join(" · ");
    if (meta) write(meta, { font: fonts.italic, size: 9.5, color: [0.5, 0.5, 0.5], gapAfter: 6 });
    const intro = stripHtml(scene.introHtml).trim();
    if (intro) write(intro, { font: fonts.regular, size: 11 });
    rule();

    for (const e of scene.entries) {
      const text = stripHtml(e.html).trim();
      if (e.kind === "chapter") {
        write(e.chapterTitle ?? "", { font: fonts.bold, size: 14, align: "center", gapBefore: 14, gapAfter: 2 });
        if (e.chapterSummary) write(e.chapterSummary, { font: fonts.italic, size: 10, color: [0.4, 0.4, 0.4], align: "center", gapAfter: 6 });
      } else if (e.kind === "narrator") {
        write(text, { font: fonts.italic, size: 11, indent: 14, gapBefore: 8 });
      } else if (e.kind === "roll") {
        write(`${e.author}: ${text}`, { font: fonts.regular, size: 10, color: [0.4, 0.4, 0.4], gapBefore: 8 });
      } else {
        write(e.author, { font: fonts.bold, size: 9.5, color: [0.42, 0.24, 0.29], gapBefore: 10 });
        write(text, { font: fonts.regular, size: 11 });
      }
    }
  });

  // Seitenzahlen
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const label = `${i + 1} / ${pages.length}`;
    const w = fonts.regular.widthOfTextAtSize(label, 9);
    p.drawText(label, { x: (PAGE_W - w) / 2, y: 28, size: 9, font: fonts.regular, color: rgb(0.6, 0.6, 0.6) });
  });

  return doc.save();
}
