import { EmojiHtml } from "@/components/custom-emoji-provider";
import type { Book, BookEntry } from "@/lib/story-book";
import { sanitizePostHtml } from "@/lib/sanitize";
import { PrintButton } from "./print-button";

// Buchansicht einer Szene oder eines Handlungsstrangs: Titelseite, Inhaltsverzeichnis, Text.
// Über "Als PDF speichern" (Druckdialog des Browsers) entsteht das PDF, über den Link das E-Book (EPUB).
export function BookView({ book, epubHref }: { book: Book; epubHref: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print:max-w-none print:p-0">
      <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-xl bg-surface-2 p-3 text-sm">
        <span className="flex-1 text-fg-soft">Deine Geschichte als Buch.</span>
        <PrintButton />
        <a href={epubHref} className="rounded-md border border-line px-3 py-1.5 font-medium text-fg-soft transition hover:bg-surface-3 hover:text-fg">
          E-Book (EPUB) laden
        </a>
      </div>

      <section className="book-avoid flex min-h-[70vh] flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br from-[#3b2b4d] to-[#8a4a5d] p-10 text-center text-[#f6efe6] print:min-h-[95vh] print:rounded-none print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">
        {book.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={book.coverImage} alt="" className="max-h-72 rounded-lg object-cover shadow-lg" />
        )}
        <h1 className="font-serif text-4xl font-bold leading-tight">{book.title}</h1>
        <p className="text-lg opacity-90">{book.subtitle}</p>
        <p className="mt-8 text-sm opacity-70">Wortwinkel</p>
      </section>

      {book.scenes.length > 1 && (
        <section className="book-break my-10">
          <h2 className="mb-4 font-serif text-2xl">Inhalt</h2>
          <ol className="list-decimal pl-6 text-fg-soft print:text-black">
            {book.scenes.map((s) => (
              <li key={s.id} className="py-0.5">
                {s.title}
              </li>
            ))}
          </ol>
        </section>
      )}

      {book.scenes.map((scene) => (
        <section key={scene.id} className="book-break my-12">
          <h2 className="font-serif text-3xl text-fg print:text-black">{scene.title}</h2>
          {(scene.location || scene.time) && (
            <p className="mb-4 text-sm italic text-muted">{[scene.location, scene.time].filter(Boolean).join(" · ")}</p>
          )}
          <EmojiHtml className="post-content text-fg-soft print:text-black" html={sanitizePostHtml(scene.introHtml)} />
          <div className="mt-4 flex flex-col gap-3">
            {scene.entries.map((e, i) => (
              <Entry key={i} entry={e} n={scene.entries.slice(0, i).filter((x) => x.kind === "chapter").length + 1} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Entry({ entry, n }: { entry: BookEntry; n: number }) {
  if (entry.kind === "chapter") {
    return (
      <div className="book-avoid my-6 text-center">
        <p className="text-xs uppercase tracking-wide text-muted">Kapitel {n}</p>
        <h3 className="font-serif text-2xl text-fg print:text-black">{entry.chapterTitle}</h3>
        {entry.chapterSummary && <p className="mx-auto max-w-md text-sm italic text-muted">{entry.chapterSummary}</p>}
      </div>
    );
  }
  if (entry.kind === "narrator") {
    return <EmojiHtml className="post-content px-4 font-serif italic text-fg-soft print:text-black" html={sanitizePostHtml(entry.html)} />;
  }
  return (
    <div className={entry.kind === "roll" ? "text-sm text-muted" : ""}>
      <p className="text-sm font-semibold text-accent print:text-black">{entry.author}</p>
      <EmojiHtml className="post-content text-fg-soft print:text-black" html={sanitizePostHtml(entry.html)} />
    </div>
  );
}
