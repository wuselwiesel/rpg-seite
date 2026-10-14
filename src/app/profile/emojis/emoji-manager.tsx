"use client";

import { confirmDialog } from "@/components/confirm-dialog";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { RevealRow } from "@/components/reveal-row";
import { EmojiUploadForm } from "@/components/emoji-upload-form";
import { deleteCustomEmoji } from "./actions";

type EmojiRow = { id: string; name: string; image_url: string; created_by: string; world_only: boolean };

export function EmojiManager({
  emojis,
  currentUserId,
  worldName,
}: {
  emojis: EmojiRow[];
  currentUserId: string;
  worldName: string | null;
}) {
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!(await confirmDialog({ message: "Dieses Emoji wirklich löschen?", confirmLabel: "Löschen", danger: true }))) return;
    const err = await deleteCustomEmoji(id);
    if (err) setError(err);
    else window.location.reload();
  }

  const worldEmojis = emojis.filter((e) => e.world_only);
  const everywhere = emojis.filter((e) => !e.world_only);

  return (
    <div className="flex flex-col gap-6">
      <EmojiUploadForm title="Neues Emoji" onDone={() => window.location.reload()} />

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <EmojiGroup title={worldName ? `In ${worldName} (${worldEmojis.length})` : `Diese Welt (${worldEmojis.length})`} emojis={worldEmojis} currentUserId={currentUserId} onRemove={remove} empty="Noch keine Emojis in dieser Welt. Schreib später :name: in Beiträge, Kommentare und Chats." />
      {everywhere.length > 0 && <EmojiGroup title={`In allen Welten (${everywhere.length})`} emojis={everywhere} currentUserId={currentUserId} onRemove={remove} />}
    </div>
  );
}
function EmojiGroup({
  title,
  emojis,
  currentUserId,
  onRemove,
  empty,
}: {
  title: string;
  emojis: EmojiRow[];
  currentUserId: string;
  onRemove: (id: string) => void;
  empty?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-fg">{title}</p>
      {emojis.length === 0 ? (
        empty ? <p className="text-sm text-muted">{empty}</p> : null
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {emojis.map((e) => (
            <RevealRow
              key={e.id}
              className="rounded-xl bg-surface-2 px-3 py-2"
              actions={
                e.created_by === currentUserId ? (
                  <button type="button" onClick={() => onRemove(e.id)} aria-label={`:${e.name}: löschen`} className="shrink-0 rounded-full p-1 text-muted transition hover:text-red-500">
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
  );
}
