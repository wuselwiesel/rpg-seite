import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCollection } from "@/lib/clip-server";
import { EmojiHtml } from "@/components/custom-emoji-provider";
import { PdfButton } from "@/components/pdf-button";
import { formatDateTime } from "@/lib/format";

// Druckansicht einer Sammlung „Wichtige Momente“ (im Druckdialog „Als PDF speichern“ wählen).
export default async function AusschnittDruckPage({ searchParams }: PageProps<"/ausschnitte/druck">) {
  const { sammlung } = await searchParams;
  if (typeof sammlung !== "string") notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const collection = await loadCollection(supabase, sammlung);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <PdfButton className="mb-6" />
      <h1 className="font-serif text-3xl text-fg">{collection.name}</h1>
      <p className="mb-6 text-sm text-muted">{collection.characterName}</p>
      {collection.clips.length === 0 && <p className="text-sm text-muted">Noch keine Ausschnitte.</p>}
      <div className="flex flex-col gap-8">
        {collection.clips.map((clip) => (
          <article key={clip.id} className="book-avoid">
            <h2 className="font-serif text-xl text-fg">{clip.title}</h2>
            <p className="text-xs text-muted">{[clip.scene_title && `Szene: ${clip.scene_title}`, `gespeichert am ${formatDateTime(clip.created_at)}`].filter(Boolean).join(" · ")}</p>
            {clip.note && <p className="mt-2 whitespace-pre-wrap text-sm italic text-fg-soft">{clip.note}</p>}
            <div className="mt-3 flex flex-col gap-3">
              {clip.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-line px-4 py-2">
                  <p className="text-xs text-muted">
                    <span className="font-medium text-fg">{item.author}</span> · {formatDateTime(item.at)}
                  </p>
                  <EmojiHtml className="post-content mt-1 text-sm text-fg-soft" html={item.html} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
