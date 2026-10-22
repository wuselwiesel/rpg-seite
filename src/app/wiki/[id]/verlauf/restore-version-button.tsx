"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History } from "lucide-react";
import { restoreWikiVersion } from "../../version-actions";
import { confirmDialog } from "@/components/confirm-dialog";

export function RestoreVersionButton({ pageId, versionId }: { pageId: string; versionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          if (!(await confirmDialog({ message: "Diese Fassung wiederherstellen? Der jetzige Stand bleibt im Verlauf erhalten.", confirmLabel: "Wiederherstellen" }))) return;
          start(async () => {
            const err = await restoreWikiVersion(pageId, versionId);
            if (err) setError(err);
            else router.push(`/wiki/${pageId}`);
          });
        }}
        className="flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-sm font-medium text-fg-soft transition hover:text-fg disabled:opacity-40"
      >
        <History className="h-3.5 w-3.5" strokeWidth={2} />
        Wiederherstellen
      </button>
    </span>
  );
}
