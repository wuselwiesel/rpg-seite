"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteWikiPage } from "../actions";

export function DeleteWikiPageButton({
  wikiPageId,
  hasSubpages = false,
  backTo = "/wiki",
}: {
  wikiPageId: string;
  hasSubpages?: boolean;
  backTo?: string;
}) {
  const router = useRouter();

  async function handleDelete() {
    const text = hasSubpages
      ? "Diese Seite wirklich löschen? Ihre Unterseiten bleiben erhalten und rücken eine Ebene nach oben."
      : "Diese Seite wirklich löschen?";
    if (!confirm(text)) return;
    const error = await deleteWikiPage(wikiPageId);
    if (error) {
      alert(error);
      return;
    }
    router.push(backTo);
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      title="Löschen"
      aria-label="Seite löschen"
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-500"
    >
      <Trash2 className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
