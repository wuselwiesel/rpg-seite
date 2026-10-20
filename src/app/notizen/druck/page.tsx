import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { selectNotes } from "@/lib/notes-data";
import { noteTitle } from "@/lib/notes";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { PdfButton } from "@/components/pdf-button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Notizen drucken" };

// Druckansicht eigener Notizen (im Druckdialog „Als PDF speichern“ wählen): ?id=… oder ?ordner=…&tag=…&welt=…
export default async function NotesPrintPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : null);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const notes = await selectNotes(supabase, user.id, { id: one("id"), folder: one("ordner"), tag: one("tag"), world: one("welt") });
  if (notes.length === 0) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <PdfButton className="mb-6" />
      <div className="flex flex-col gap-10">
        {notes.map((n) => (
          <article key={n.id} className="book-avoid">
            <h1 className="font-serif text-3xl text-fg">{noteTitle(n)}</h1>
            <p className="mb-1 text-xs text-muted">
              {[formatDateTime(n.updatedAt), n.tags.map((t) => `#${t}`).join(" ")].filter(Boolean).join(" · ")}
            </p>
            {n.links.length > 0 && <p className="mb-3 text-xs text-muted">Verknüpft: {n.links.map((l) => l.label).join(", ")}</p>}
            <EmojiHtml className="post-content mt-3 text-fg" html={n.body} />
          </article>
        ))}
      </div>
    </div>
  );
}
