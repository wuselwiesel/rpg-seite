"use client";

import { useState, useTransition } from "react";
import { Pin } from "lucide-react";
import { togglePinPost } from "@/app/posts/actions";

// Beitrag im Profil oben anpinnen (max. 3), nur für die Besitzer:in.
export function PinPostButton({ postId, initialPinned }: { postId: string; initialPinned: boolean }) {
  const [pinned, setPinned] = useState(initialPinned);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          const next = !pinned;
          setPinned(next);
          startTransition(async () => {
            const err = await togglePinPost(postId);
            if (err) {
              setPinned(!next);
              setError(err);
            }
          });
        }}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
          pinned ? "bg-accent-strong text-on-accent-strong" : "bg-surface-2 text-fg-soft hover:bg-surface-3"
        }`}
      >
        <Pin className={`h-3.5 w-3.5 ${pinned ? "fill-current" : ""}`} strokeWidth={2} />
        {pinned ? "Angepinnt" : "Anpinnen"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
