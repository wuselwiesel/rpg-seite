"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { EmojiUploadForm } from "@/components/emoji-upload-form";
import { deleteCustomEmoji } from "./actions";

type EmojiRow = { id: string; name: string; image_url: string; created_by: string };

export function EmojiManager({
  worldName,
  emojis,
  currentUserId,
  isWorldOwner,
}: {
  worldName: string;
  emojis: EmojiRow[];
  currentUserId: string;
  isWorldOwner: boolean;
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
      <EmojiUploadForm title={`Neues Emoji für „${worldName}“`} onDone={() => window.location.reload()} />

      <div>
        {error && <p className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <p className="mb-2 text-sm font-medium text-fg">Emojis dieser Welt ({emojis.length})</p>
        {emojis.length === 0 ? (
          <p className="text-sm text-muted">Noch keine eigenen Emojis. Schreib später :name: in Beiträge, Kommentare und Chats.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {emojis.map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.image_url} alt={`:${e.name}:`} className="h-8 w-8 shrink-0 object-contain" />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">:{e.name}:</span>
                {(e.created_by === currentUserId || isWorldOwner) && (
                  <button
                    type="button"
                    onClick={() => remove(e.id)}
                    aria-label={`:${e.name}: löschen`}
                    className="shrink-0 rounded-full p-1 text-muted transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}