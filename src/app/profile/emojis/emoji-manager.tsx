"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { EmojiUploadForm } from "@/components/emoji-upload-form";
import { deleteCustomEmoji } from "./actions";

type EmojiRow = { id: string; name: string; image_url: string; created_by: string };

export function EmojiManager({
  emojis,
  currentUserId,
}: {
  emojis: EmojiRow[];
  currentUserId: string;
}) {
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!confirm("Dieses Emoji wirklich löschen?")) return;
    const err = await deleteCustomEmoji(id);
    if (err) setError(err);
    else window.location.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <EmojiUploadForm title="Neues Emoji" onDone={() => window.location.reload()} />

      <div>
        {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <p className="mb-2 text-sm font-medium text-fg">Alle Emojis ({emojis.length})</p>
        {emojis.length === 0 ? (
          <p className="text-sm text-muted">Noch keine eigenen Emojis. Schreib später :name: in Beiträge, Kommentare und Chats.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {emojis.map((e) => (
              <RevealRow
                key={e.id}
                className="rounded-xl bg-surface-2 px-3 py-2"
                actions={
                  e.created_by === currentUserId ? (
                    <button type="button" onClick={() => remove(e.id)} aria-label={`:${e.name}: löschen`} className="shrink-0 rounded-full p-1 text-muted transition hover:text-red-500">
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  ) : null
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image_url} alt={`:${e.name}:`} className="h-8 w-8 shrink-0 object-contain" />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">:{e.name}:</span>
              </RevealRow>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}