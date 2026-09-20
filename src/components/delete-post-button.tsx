"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePost } from "@/app/posts/actions";

// Eigenen Beitrag endgültig löschen (mit Rückfrage).
export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Diesen Beitrag endgültig löschen?")) return;
          setError(null);
          startTransition(async () => {
            const err = await deletePost(postId);
            if (err) setError(err);
            else router.replace("/");
          });
        }}
        className="flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg-soft transition hover:bg-surface-3 hover:text-red-600 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        Löschen
      </button>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
