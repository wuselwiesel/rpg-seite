"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { revealSecretItem } from "../secret-actions";
import { confirmDialog } from "@/components/confirm-dialog";

// Macht ein geheimes Feld öffentlich (nur für die Besitzer:in der Figur sichtbar).
export function RevealSecretButton({ itemId, title }: { itemId: string; title: string }) {
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
          if (!(await confirmDialog({ message: `„${title}“ aufdecken? Das Feld steht danach für alle im Steckbrief.`, confirmLabel: "Aufdecken" }))) return;
          start(async () => {
            const err = await revealSecretItem(itemId);
            if (err) setError(err);
            else router.refresh();
          });
        }}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-40"
      >
        <Eye className="h-3 w-3" strokeWidth={2} />
        Aufdecken
      </button>
    </span>
  );
}
