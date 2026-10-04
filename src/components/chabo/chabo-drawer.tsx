"use client";

import { useEffect, useState } from "react";
import { IdCard, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeSheet, type SheetData } from "@/lib/sheet-rules";
import { Chabo } from "./chabo";
import type { Character } from "@/lib/types";

// Knopf mit seitlichem Fenster: der ChaBo des Charakters, ohne die Szene zu verlassen.
export function ChaboDrawer({ characterId, characterName, mentionCharacters = [] }: { characterId: string; characterName: string; mentionCharacters?: Character[] }) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetData | null | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const { data } = await createClient().from("character_sheets").select("data").eq("character_id", characterId).maybeSingle<{ data: unknown }>();
      if (!cancelled) setSheet(data ? normalizeSheet(data.data) : null);
    })();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, characterId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="ChaBo öffnen"
        aria-label="ChaBo öffnen"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
      >
        <IdCard className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Charakterbogen ${characterName}`}>
          <button type="button" aria-label="Schließen" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/30" />
          <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-app p-3 shadow-xl sm:p-4">
            <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted transition hover:text-fg">
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
            {sheet === undefined ? (
              <p className="p-6 text-sm text-muted">Lädt …</p>
            ) : sheet === null ? (
              <p className="p-6 text-sm text-muted">
                {characterName} hat noch keinen ChaBo.{" "}
                <a href={`/characters/${characterId}/chabo`} className="text-accent underline underline-offset-2">
                  Jetzt anlegen
                </a>
              </p>
            ) : (
              <Chabo key={characterId} characterId={characterId} characterName={characterName} initial={sheet} editable mentionCharacters={mentionCharacters} variant="panel" />
            )}
          </aside>
        </div>
      )}
    </>
  );
}
