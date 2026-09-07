"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteWikiPage } from "../actions";

export function DeleteWikiPageButton({ wikiPageId }: { wikiPageId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Diesen Wiki-Eintrag wirklich löschen?")) return;
    const error = await deleteWikiPage(wikiPageId);
    if (error) {
      alert(error);
      return;
    }
    router.push("/wiki");
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Löschen"
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-500"
    >
      <Trash2 className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
