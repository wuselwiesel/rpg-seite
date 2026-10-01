"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteRedaktionPost } from "../actions";

export function DeleteRedaktionPostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Diesen Beitrag wirklich löschen?")) return;
    setPending(true);
    const err = await deleteRedaktionPost(postId);
    setPending(false);
    if (err) {
      setError(err);
      return;
    }
    router.push("/redaktion");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Beitrag löschen"
        className="rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-red-500 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
