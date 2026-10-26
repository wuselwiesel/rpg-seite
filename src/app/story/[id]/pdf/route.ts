import { NextResponse } from "next/server";
import React from "react";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderToBuffer, Document, Page, Text, View, StyleSheet } = require("@react-pdf/renderer") as typeof import("@react-pdf/renderer");
import { createClient } from "@/lib/supabase/server";
import { loadBook } from "@/lib/story-book";
import { stripHtml } from "@/lib/strip-html";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Times-Roman", fontSize: 11, lineHeight: 1.5, color: "#222" },
  title: { fontSize: 26, fontFamily: "Times-Bold", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 13, textAlign: "center", color: "#666", marginBottom: 4 },
  brand: { fontSize: 10, textAlign: "center", color: "#999", marginBottom: 32 },
  sceneTitle: { fontSize: 16, fontFamily: "Times-Bold", marginTop: 24, marginBottom: 4 },
  sceneMeta: { fontSize: 9, color: "#888", fontFamily: "Times-Italic", marginBottom: 8 },
  chapterTitle: { fontSize: 14, fontFamily: "Times-Bold", textAlign: "center", marginTop: 16, marginBottom: 4 },
  chapterSummary: { fontSize: 10, fontFamily: "Times-Italic", textAlign: "center", color: "#666", marginBottom: 6 },
  entryAuthor: { fontSize: 9, fontFamily: "Times-Bold", color: "#6b3e4a", marginTop: 10, marginBottom: 2 },
  entryText: { fontSize: 11 },
  narratorText: { fontSize: 11, fontFamily: "Times-Italic", marginLeft: 12, marginRight: 12 },
  rollText: { fontSize: 10, color: "#666", marginTop: 8 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: "#ccc", marginVertical: 16 },
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Nicht angemeldet.", { status: 401 });

  const book = await loadBook({ sceneId: id });
  if (!book) return new NextResponse("Nicht gefunden.", { status: 404 });

  const doc = React.createElement(
    Document,
    { title: book.title, author: "Wortwinkel", language: "de" },
    ...book.scenes.map((scene) =>
      React.createElement(
        Page,
        { key: scene.id, size: "A4", style: styles.page },
        // Titelblock der Szene
        React.createElement(Text, { style: styles.title }, book.scenes.length > 1 ? book.title : scene.title),
        book.scenes.length > 1
          ? React.createElement(Text, { style: styles.sceneTitle }, scene.title)
          : null,
        React.createElement(Text, { style: styles.subtitle }, book.subtitle),
        React.createElement(Text, { style: styles.brand }, "Wortwinkel"),
        (scene.location ?? scene.time)
          ? React.createElement(
              Text,
              { style: styles.sceneMeta },
              [scene.location, scene.time].filter(Boolean).join(" · "),
            )
          : null,
        // Einleitungstext
        stripHtml(scene.introHtml).trim()
          ? React.createElement(Text, { style: styles.entryText }, stripHtml(scene.introHtml).trim())
          : null,
        React.createElement(View, { style: styles.divider }),
        // Nachrichten
        ...scene.entries.map((e, i) => {
          if (e.kind === "chapter") {
            return React.createElement(
              View,
              { key: i },
              React.createElement(Text, { style: styles.chapterTitle }, e.chapterTitle ?? ""),
              e.chapterSummary
                ? React.createElement(Text, { style: styles.chapterSummary }, e.chapterSummary)
                : null,
            );
          }
          if (e.kind === "narrator") {
            return React.createElement(Text, { key: i, style: styles.narratorText }, stripHtml(e.html).trim());
          }
          if (e.kind === "roll") {
            return React.createElement(Text, { key: i, style: styles.rollText }, `${e.author}: ${stripHtml(e.html).trim()}`);
          }
          // Normale Nachricht
          return React.createElement(
            View,
            { key: i },
            React.createElement(Text, { style: styles.entryAuthor }, e.author),
            React.createElement(Text, { style: styles.entryText }, stripHtml(e.html).trim()),
          );
        }),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  const file = book.title.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "Geschichte";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file}.pdf"; filename*=UTF-8''${encodeURIComponent(file)}.pdf`,
      "Cache-Control": "private, no-store",
    },
  });
}
