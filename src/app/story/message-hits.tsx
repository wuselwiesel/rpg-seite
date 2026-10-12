import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export type MessageHit = { id: string; name: string; snippet: string; at: string };

function Marked({ text, term }: { text: string; term: string }) {
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i < 0 || !term) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-accent/25 px-0.5 text-fg">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

// Nachrichten einer Szene, in denen der Suchtext vorkommt; ein Klick springt in der Szene zu der Nachricht.
export function MessageHits({ storyPostId, hits, term, total }: { storyPostId: string; hits: MessageHit[]; term: string; total: number }) {
  if (hits.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-col gap-1 rounded-xl bg-surface-2 p-1.5" aria-label="Gefundene Nachrichten">
      {hits.map((h) => (
        <li key={h.id}>
          <Link
            href={`/story/${storyPostId}?hervor=${h.id}#beitrag-${h.id}`}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-surface-3"
          >
            <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
            <span className="min-w-0">
              <span className="block text-xs text-muted">
                <span className="font-medium text-fg-soft">{h.name}</span> · {formatDateTime(h.at)}
              </span>
              <span className="block text-fg">
                <Marked text={h.snippet} term={term} />
              </span>
            </span>
          </Link>
        </li>
      ))}
      {total > hits.length && <li className="px-2 py-0.5 text-xs text-muted">+ {total - hits.length} weitere in der Szene</li>}
    </ul>
  );
}
